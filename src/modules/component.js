import React, { Component } from 'react'
import { ConfigProvider, notification } from 'antd'
import ComponentPage from '../pages/component/index'
import intl from 'react-intl-universal';
import dayjs from 'dayjs';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';
const locales = {
  "en": require('../locales/en-US.json'),
  "zh": require('../locales/zh-CN.json'),
};

export default class index extends Component {
  constructor(props) {
    super(props);
    const { baseInfo } = props || {};
    this.state = {
      colorPrimary: baseInfo?.colorPrimary || '#1677ff',
      currentLocale: baseInfo?.currentLocale || 'zh',
      initDone: false,
      antdLocale: zhCN
    }
  }

  componentDidMount() {
    this.loadLocales();
    notification.config({
      className: 'custom-class',
      style: {
        marginBottom: 0,
      }
    });
  }

  loadLocales = () => {
    const { currentLocale } = this.state
    if (currentLocale == 'zh') {
      this.setState({
        antdLocale: zhCN
      })
      dayjs.locale('zh-cn');
    } else {
      this.setState({
        antdLocale: enUS
      })
      dayjs.locale('en');
    }
    intl.init({
      currentLocale: currentLocale,
      locales,
    })
      .then(() => {
        this.setState({ initDone: true });
      });
  }

  render() {
    const { colorPrimary, antdLocale, initDone } = this.state;
    return (
      <ConfigProvider
        theme={{
          token: {
            colorPrimary
          }
        }}
        locale={antdLocale}
        prefixCls='demo-ant'
      >
        {initDone && <ComponentPage {...this.props} />}
      </ConfigProvider>
    )
  }
}
