import React, { Component } from 'react'
import { ConfigProvider, Tabs } from 'antd'
import Content from './content/index'
import Other from './other/index'
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import intl from 'react-intl-universal';
import 'dayjs/locale/zh-cn';
const locales = {
  "en": require('../locales/en-US.json'),
  "zh": require('../locales/zh-CN.json'),
};

export default class index extends Component {
  constructor(props) {
    super(props);
    this.state = {
      colorPrimary: this.props?.baseInfo?.colorPrimary || '#1677ff',
      currentLocale: this.props?.baseInfo?.currentLocale || 'zh',
      initDone: false,
      antdLocale: zhCN
    }
  }
  componentDidMount() {
    this.loadLocales()
  }
  loadLocales() {
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
  onChange = (key) => {
    console.log(key);
  };
  render() {
    const { colorPrimary, antdLocale } = this.state
    return (
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: colorPrimary
          }
        }}
        locale={antdLocale}
      >
        {this.state.initDone &&
          <Tabs
            onChange={this.onChange}
            type="card"
            items={[
              {
                label: intl.get('root'),
                key: 'Content',
                children: <Content {...this.props} />,
              },
              {
                label: intl.get('other'),
                key: 'Other',
                children: <Other {...this.props} />,
              }
            ]}
          />

        }

      </ConfigProvider>
    )
  }
}