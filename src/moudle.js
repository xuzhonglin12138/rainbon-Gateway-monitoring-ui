import PlatformPage from './modules/root'
import ApplicationPage from './modules/other'
import ComponentPage from './modules/component'
import { RainbondRootPagePlugin } from 'xu-demo-data'

export const plugin = new RainbondRootPagePlugin()
  .setRootPage(PlatformPage)
  .addOtherPage(ApplicationPage)

plugin.viewPages = {
  Platform: PlatformPage,
  Application: ApplicationPage,
  Component: ComponentPage,
}
