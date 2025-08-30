import 'react-native-gesture-handler';   // <-- add this as the FIRST import
import { registerRootComponent } from 'expo';
import App from './src/App';
registerRootComponent(App);
