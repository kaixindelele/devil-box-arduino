/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React , {Component} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Button,
  NativeEventEmitter,
  NativeModules,
  Platform,
  PermissionsAndroid,
  TouchableHighlight,
  ScrollView,
  AppState,
  FlatList,
  ViewBase,
} from 'react-native';

import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';

import { 
Header,
Input,
Overlay
 } from 'react-native-elements';

 import HorizontalDatePicker from '@logisticinfotech/react-native-horizontal-date-picker';
import {SwipeListView} from 'react-native-swipe-list-view';
//import { UsbSerial} from 'react-native-usbserial';

//蓝牙
import BleManager from 'react-native-ble-manager';
import { getParseTreeNode } from 'typescript';

const BleManagerModule = NativeModules.BleManager;
//console.log( "BleManagerModule", BleManagerModule);
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);




//const usbs = new UsbSerial();
 export default class App extends Component<{}> {
  constructor(props){
    super(props);
    this.state = {
      todo:'',
      start:'',
      end:'',
      items:[],
      timeSelect:false,
      //usb:'未定义',
      scanning:false,
      peripherals: new Map(),
      appState: '',
      connectStateColor:'#fff',
      flag:true,
      prompt:true,
      promptWindow:false
    };
    this.handleDiscoverPeripheral = this.handleDiscoverPeripheral.bind(this);
    this.handleStopScan = this.handleStopScan.bind(this);
    this.handleUpdateValueForCharacteristic = this.handleUpdateValueForCharacteristic.bind(this);
    this.handleDisconnectedPeripheral = this.handleDisconnectedPeripheral.bind(this);
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
  }

//蓝牙
componentDidMount() {
  AppState.addEventListener('change', this.handleAppStateChange);
  BleManager.enableBluetooth();
  BleManager.start({showAlert: true});

  this.handlerDiscover = bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral );
  this.handlerStop = bleManagerEmitter.addListener('BleManagerStopScan', this.handleStopScan );
  this.handlerDisconnect = bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral );
  this.handlerUpdate = bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic )

  if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
          if (result) {
            console.log("Permission is OK");
          } else {
            PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
              if (result) {
                console.log("User accept");
              } else {
                console.log("User refuse");
              }
            });
          }
    });
  }

}

handleAppStateChange(nextAppState) {
  if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
    console.log('App has come to the foreground!')
    BleManager.getConnectedPeripherals([]).then((peripheralsArray) => {
      console.log('Connected peripherals: ' + peripheralsArray.length);
    });
  }
  this.setState({appState: nextAppState});
}

componentWillUnmount() {
  this.handlerDiscover.remove();
  this.handlerStop.remove();
  this.handlerDisconnect.remove();
  this.handlerUpdate.remove();
}

handleDisconnectedPeripheral(data) {
  let peripherals = this.state.peripherals;
  let peripheral = peripherals.get(data.peripheral);
  if (peripheral) {
    peripheral.connected = false;
    peripherals.set(peripheral.id, peripheral);
    this.setState({peripherals});
  }
  console.log('Disconnected from ' + data.peripheral);
}

handleUpdateValueForCharacteristic(data) {
  console.log('Received data from ' + data.peripheral + ' characteristic ' + data.characteristic, data.value);
}

handleStopScan() {
  console.log('Scan is stopped');
  this.setState({ scanning: false });
  this.setState({flag:true});
  this.handleDiscoverPeripheral();
}

startScan() {
  if (!this.state.scanning) {
    //this.setState({peripherals: new Map()});
    BleManager.scan([], 3, true).then((results) => {
      console.log('Scanning...');
      this.setState({scanning:true});
    //  console.log("result:",results);
    });
  }
}

retrieveConnected(){
  BleManager.getConnectedPeripherals([]).then((results) => {
    if (results.length == 0) {
      console.log('No connected peripherals')
    }
    //console.log(results);
    var peripherals = this.state.peripherals;
    for (var i = 0; i < results.length; i++) {
      var peripheral = results[i];
      peripheral.connected = true;
      peripherals.set(peripheral.id, peripheral);
      this.setState({ peripherals });
    }
  });
}

handleDiscoverPeripheral(peripheral){
  var peripherals = this.state.peripherals;


  //console.log('Got ble peripheral', peripheral);
  if(peripheral){
    if (!peripheral.name) {
      if(this.state.flag){
        peripheral.name = 'DEVIL-BOX';
        this.setState({flag:false})
      }else{
        peripheral.name = 'NO NAME';
      }
      
    }
    peripherals.set(peripheral.id, peripheral);
  }
   this.setState({ peripherals });
   console.log("设备列表",peripherals);
}

test(peripheral) {
  if (peripheral){
    if (!peripheral.connected){
      console.log("没连接呢")
      if(this.state.prompt){
        this.state.promptWindow = true;
        this.setState({prompt:false})
      }
      this.setState({connectStateColor:'red'})
      BleManager.connect(peripheral.id).then(() => {
        
        let peripherals = this.state.peripherals;
        let p = peripherals.get(peripheral.id);
        

        if (p) {
          p.connected = true;
          peripherals.set(peripheral.id, p);
          this.setState({peripherals});
          //this.setState({color:'green'});
          //this.setState({connectStateColor:'green'})
          console.log("连接成功啦！")
        }
        console.log('Connected to ' + peripheral.id);


        setTimeout(() => {

          /* Test read current RSSI value
          BleManager.retrieveServices(peripheral.id).then((peripheralData) => {
            console.log('Retrieved peripheral services', peripheralData);
            BleManager.readRSSI(peripheral.id).then((rssi) => {
              console.log('Retrieved actual RSSI value', rssi);
            });
          });*/

          // Test using bleno's pizza example
          // https://github.com/sandeepmistry/bleno/tree/master/examples/pizza
          BleManager.retrieveServices(peripheral.id).then((peripheralInfo) => {
            console.log(peripheralInfo);
            var service = '13333333-3333-3333-3333-333333333337';
            var bakeCharacteristic = '13333333-3333-3333-3333-333333330003';
            var crustCharacteristic = '13333333-3333-3333-3333-333333330001';

            setTimeout(() => {
              BleManager.startNotification(peripheral.id, service, bakeCharacteristic).then(() => {
                console.log('Started notification on ' + peripheral.id);
                setTimeout(() => {
                  BleManager.write(peripheral.id, service, crustCharacteristic, [2]).then(() => {
                    console.log('Writed NORMAL crust');
                    BleManager.write(peripheral.id, service, bakeCharacteristic, [3,4]).then(() => {
                      console.log('Writed 351 temperature, the pizza should be BAKED');
                      /*
                      var PizzaBakeResult = {
                        HALF_BAKED: 0,
                        BAKED:      1,
                        CRISPY:     2,
                        BURNT:      3,
                        ON_FIRE:    4
                      };*/
                    });
                  });

                }, 500);
              }).catch((error) => {
                console.log('Notification error', error);
              });
            }, 200);
          });

        }, 900);
      }).catch((error) => {
        console.log('Connection error', error);
      });
    }
  }
}

renderItem(item) {
 let color = item.connected ? 'green' : '#fff';
  return (
    <TouchableHighlight onPress={() => this.test(item) }>
      <View style={[styles.row, {backgroundColor: color}]}>
        <Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>{item.name}</Text>
        <Text style={{fontSize: 10, textAlign: 'center', color: '#333333', padding: 2}}>RSSI: {item.rssi}</Text>
        <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 2, paddingBottom: 20}}>{item.id}</Text>
        <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 2, paddingBottom: 20}}>{item.localName}</Text>
      </View>
    </TouchableHighlight>
  );
}


//   async getDeviceAsync() {
//     try {
//       const deviceList = await usbs.getDeviceListAsync();
//       const firstDevice = deviceList[0];
//       //console.log(firstDevice);
//       if (firstDevice) {
//           const usbSerialDevice = await usbs.openDeviceAsync(firstDevice);
//           if(usbSerialDevice){
//             while(true){
//               usbSerialDevice.writeAsync("2");
//             }
//           }
//         }
//   } catch (err) {
//       console.warn(err);
//   }
//  }

  closepromptwindow = () => {
  this.setState({promptWindow:false});
}
  onStartTimeSelected =res => {
    this.setState({ start:res.datetime});
  }
  onEndTimeSelected =res => {
    this.setState({ end:res.datetime});
  }


  addTodo = () =>{
    this.setState({items:[{
      start: this.state.start,
      end:this.state.end,
      todo: this.state.todo,
      key: this.state.start+this.state.end+new Date(),
    },...this.state.items]})
    //console.log(this.state.items);
  } 

  chooseTime = () => {
    this.setState({timeSelect:true});
  }

  timeSelected = () => {
    this.setState({timeSelect:false});
  }

  synchronizeTodos = () => {
    this.setState({items:[]});
  }
  render() {
    let list = Array.from(this.state.peripherals.values());
    const btnScanTitle = 'Scan Bluetooth (' + (this.state.scanning ? 'on' : 'off') + ')';

    return (
    <>
  <ScrollView>
    <Header
  centerComponent={{ text: 'TODO', style: { color: '#fff' } }}
/>  

<SwipeListView
data = {this.state.items}
renderItem ={
  (data,rowMap) => (
    <View style={{padding:5}}>
      <Text>todo:{data.item.todo}</Text>
      <Text>start time:{data.item.start}</Text>
      <Text>end time:{data.item.end}</Text>
    </View>
  )
}
>
</SwipeListView>
<Text>{this.state.usb}</Text>
<View style={styles.mainWrapper}>
<Input
  placeholder='输入待办事项'
  onChangeText={value => this.setState({ todo: value })}
/> 
{/* <Modal
  visible={this.state.promptWindow}
  onRequestClose={this.closepromptwindow}
><Text>连接成功</Text>
<Button
     title="确定"
     onPress={this.closepromptwindow}
     color="#009ad6"
     ></Button></Modal> */}
<Modal
visible = {this.state.timeSelect}
onRequestClose={this.timeSelected}
transparent={false}>
<View style={styles.timeChooseWrapper}>
<Text  style={styles.textStyle}>Start Time</Text>
<HorizontalDatePicker
 pickerType={'datetime'}
 minDate={new Date()}
 defaultSelected={new Date()}
 dayFormat={'DD'}
 monthFormat ={'MMM'}
 yearFormat ={'YY'}
 timeFormat ={'HH:mm a'}
 timeStep={20}
 datePickerBG={require('./dateBG.png')}
 timePickerBG={require('./dateBG.png')}
 returnDateFormat={'Do MMMM YY'}
 returnTimeFormat={'hh:mm a'}
 returnDateTimeFormat={'DD-MM-YYYY HH:mm'}
 onDateTimeSelected={this.onStartTimeSelected}
 />
<Text style={styles.textStyle}>End Time</Text>
<HorizontalDatePicker
style={styles.title}
 pickerType={'datetime'}
 minDate={new Date()}
 datePickerBG={require('./dateBG.png')}
 timePickerBG={require('./dateBG.png')}
 defaultSelected={new Date()}
 dayFormat={'DD'}
 monthFormat ={'MMM'}
 yearFormat ={'YY'}
 timeFormat ={'HH:mm a'}
 timeStep={20}
 returnDateFormat={'Do MMMM YY'}
 returnTimeFormat={'hh:mm a'}
 returnDateTimeFormat={'DD-MM-YYYY HH:mm'}
 onDateTimeSelected={this.onEndTimeSelected}
 />
<Button
     title="确定"
     onPress={this.timeSelected}
     color="#009ad6"
     ></Button>

</View>

</Modal>
<View style={styles.buttonsWrapper}>
  <View style={styles.buttonWrapper}>
    <Button
     title="选择时间"
     onPress={this.chooseTime}
     ></Button>
  </View>
  <View style={styles.buttonWrapper}>
    <Button
     title="添加日程"
     onPress={this.addTodo}
     style={styles.buttonStyle}
     ></Button>
  </View>
  <View style={styles.buttonWrapper}>
    <Button
     title="发送日程"
     onPress={this.synchronizeTodos}
     style={styles.buttonStyle}
     ></Button>
  </View>
{/* <View style={styles.buttonWrapper}>
<Button
     title="USB biubiubiu"
     onPress={this.getDeviceAsync}
     style={styles.buttonStyle}
     ></Button>
</View> */}
</View>
          <View style={styles.buttonWrapper}>
            <Button title="扫描设备" onPress={() => this.startScan() } />
          </View>
        
          <View style={styles.buttonWrapper}>
            <Button title="已连接设备" onPress={() => this.retrieveConnected() } />
          </View>

            {(list.length == 0) &&
              <View style={{flex:1, margin: 20}}>
                <Text style={{textAlign: 'center'}}>无可用设备</Text>
              </View>
            }
            <View>
            <FlatList
              data={list}
              renderItem={({ item }) => this.renderItem(item) }
              keyExtractor={item => item.id}

            />
            </View>
            



</View>
</ScrollView>
    </>);
}
}


const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  mainWrapper:{
    margin: 5,
    //flexDirection:'column',
    //alignItems:'flex-end',
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: Colors.red,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
  textStyle:{
    fontSize:15,
    color: '#009ad6',
    fontWeight: '700',
    padding:8,
  },
  bottonsWrapper:{
    flexDirection:'row',
    alignItems:'flex-end'
  },
  buttonWrapper:{
    margin:10,
    width:100,
    alignSelf:'center',

  },
  timeChooseWrapper:{
    padding:10,
    margin:10,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    width: window.width,
    height: window.height
  },
  scroll: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    margin: 10,
  },
  row: {
    margin: 10
  },
});
