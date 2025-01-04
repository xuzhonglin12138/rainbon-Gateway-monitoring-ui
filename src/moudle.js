import App from './moudles/root'
import Other from './moudles/other'
import { RainbondRootPagePlugin } from 'xu-demo-data'

export  const plugin = new RainbondRootPagePlugin().setRootPage(App).addOtherPage(Other)