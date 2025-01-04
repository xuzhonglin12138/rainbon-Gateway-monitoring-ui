import React, { Component } from 'react'
import { ConfigProvider } from 'antd'
import Content from '../page/Content/index'
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
    const { baseInfo = {} } = props;
    this.state = {
      colorPrimary: baseInfo.colorPrimary || '#1677ff',
      currentLocale: baseInfo.currentLocale || 'zh',
      initDone: false,
      antdLocale: zhCN
    }
  }

  componentDidMount = () => {
    this.loadLocales();
  }

  loadLocales = () => {
    const { currentLocale } = this.state;
    const antdLocale = currentLocale === 'zh' ? zhCN : enUS;
    const dayjsLocale = currentLocale === 'zh' ? 'zh-cn' : 'en';

    this.setState({ antdLocale });
    dayjs.locale(dayjsLocale);

    await intl.init({
      currentLocale,
      locales,
    });

    this.setState({ initDone: true });
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
      >
        {initDone && <Content {...this.props} />}
      </ConfigProvider>
    )
  }
}