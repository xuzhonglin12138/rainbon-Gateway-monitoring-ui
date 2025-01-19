import React, { Component } from 'react'
import { Button, Input, Form, InputNumber, Switch, Select } from 'antd'
// import { manualRecharge } from '@/api'
const { Option } = Select;

export default class index extends Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: false,
      smsEnabled: false,  // 是否启用短信告警
    }
  }

  componentDidMount() {
  }

  render() {
    const { loading, smsEnabled } = this.state;
    const formItemStyle = { width: '100%', marginBottom: '8px' };
    return (
      <div style={{ width: '400px' }}>
        <Form
          layout="vertical"
          onFinish={this.handleModalOk}
        >
          <Form.Item
            label="最小余额"
            name="minBalance"
            rules={[{ required: true, message: '请输入最小余额' }]}
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="请输入最小余额"
              addonAfter="¥"
            />
          </Form.Item>

          <Form.Item
            label="欠费宽限期"
            name="gracePeriod"
            rules={[{ required: true, message: '请输入欠费宽限期' }]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="请输入欠费宽限期"
              addonAfter="天"
            />
          </Form.Item>

          <Form.Item
            label="是否启用短信告警"
            name="smsEnabled"
            valuePropName="checked"
          >
            <Switch onChange={(checked) => this.setState({ smsEnabled: checked })} />
          </Form.Item>

          {smsEnabled && (
            <>
              <Form.Item
                label="短信服务提供商"
                name="smsProvider"
                rules={[{ required: true, message: '请选择短信服务提供商' }]}
              >
                <Select placeholder="请选择短信服务提供商">
                  <Option value="aliyun">阿里云</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="AccessKey"
                name="accessKey"
                rules={[{ required: true, message: '请输入AccessKey' }]}
              >
                <Input placeholder="请输入AccessKey" />
              </Form.Item>

              <Form.Item
                label="SecretKey"
                name="secretKey"
                rules={[{ required: true, message: '请输入SecretKey' }]}
              >
                <Input.Password placeholder="请输入SecretKey" />
              </Form.Item>
              <h4>短信通知模版ID配置</h4>
              <Form.Item
                label="余额不足模版"
                name="balanceTemplateId"
              >
                <Input 
                  placeholder="请输入余额不足模版ID" 
                  style={formItemStyle}
                />
              </Form.Item>

              <Form.Item
                label="欠费通知模版"
                name="arrearsTemplateId"
              >
                <Input 
                  placeholder="请输入欠费通知模版ID" 
                  style={formItemStyle}
                />
              </Form.Item>

              <Form.Item
                label="清理预警模版"
                name="cleanupTemplateId"
              >
                <Input 
                  placeholder="请输入清理预警模版ID" 
                  style={formItemStyle}
                />
              </Form.Item>

              <Form.Item
                label="恢复通知模版"
                name="recoveryTemplateId"
              >
                <Input 
                  placeholder="请输入恢复通知模版ID" 
                  style={formItemStyle}
                />
              </Form.Item>
            </>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </div>
    )
  }
}
