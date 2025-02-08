import React, { Component } from 'react'
import { Form, Button, InputNumber, Spin, Modal, notification } from 'antd'
import {
  getPricingConfig,
  updatePricingConfig
} from '@/api'

export default class index extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cpuPrice: 0,
      memoryPrice: 0,
      storagePrice: 0,
      networkPrice: 0,
      regionName: this.props?.regionName || '',
    }
  }
  componentDidMount() {
    this.getPricingConfig();
  }
  getPricingConfig = () => {
    this.setState({
      loading: true
    })
    getPricingConfig({
      region_name: this.state.regionName
    }).then(res => {      
      this.setState({
        cpuPrice: res.data.cpu_price_per_core,
        memoryPrice: res.data.memory_price_per_gb,
        storagePrice: res.data.storage_price_per_gb,
        networkPrice: res.data.network_price_per_mb,
        loading: false
      })
    })
  }
  handleSave = (values) => {
    Modal.confirm({
      title: '确认保存',
      content: '确定要保存设置吗？',
      closable: false,
      onOk: () => {
        updatePricingConfig({
          cpu_price_per_core: Number(values.cpuPrice) * 1000000,
          memory_price_per_gb: Number(values.memoryPrice) * 1000000,
          storage_price_per_gb: Number(values.storagePrice) * 1000000,
          network_price_per_mb: Number(values.networkPrice) * 1000000,
          region_name: this.state.regionName
        }).then(() => {
          notification.success({
            message: '保存成功',
            description: '设置已保存',
          });
          this.getPricingConfig();
        })
      },
      onCancel: () => {
      },
    });
  }
  render() {
    return (
      <div>
        <Spin spinning={this.state.loading} tip="加载中...">
          <Form
            key={this.state.loading}
            layout="vertical"
            onFinish={this.handleSave}
            initialValues={{
              memoryPrice: this.state.memoryPrice / 1000000,
              cpuPrice: this.state.cpuPrice / 1000000,
              storagePrice: this.state.storagePrice / 1000000,
              networkPrice: this.state.networkPrice / 1000000
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Form.Item label="内存单价(GB/小时)" name="memoryPrice" style={{ flex: 1, marginRight: '10px' }}>
                <InputNumber placeholder="请输入内存单价" style={{ width: '60%' }} stringMode/>
              </Form.Item>
              <Form.Item label="CPU单价(GB/小时)" name="cpuPrice" style={{ flex: 1 }}>
                <InputNumber placeholder="请输入CPU单价" style={{ width: '60%' }} stringMode/>
              </Form.Item>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Form.Item label="存储单价(GB/小时)" name="storagePrice" style={{ flex: 1, marginRight: '10px' }}>
                <InputNumber placeholder="请输入存储单价" style={{ width: '60%' }} stringMode/>
              </Form.Item>
              <Form.Item label="流量单价(MB/小时)" name="networkPrice" style={{ flex: 1 }}>
                <InputNumber placeholder="请输入流量单价" style={{ width: '60%' }} stringMode/>
              </Form.Item>
            </div>
            <Form.Item>
              <Button type="primary" htmlType="submit">保存设置</Button>
            </Form.Item>
          </Form>
        </Spin>
      </div>
    )
  }
}
