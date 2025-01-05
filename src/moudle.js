import App from './modules/root'
import Other from './modules/other'
import { RainbondRootPagePlugin } from 'xu-demo-data'

export  const plugin = new RainbondRootPagePlugin().setRootPage(App).addOtherPage(Other)