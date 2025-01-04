import React, { Component } from 'react'
import { Form, Input, Button } from 'antd'

export default class index extends Component {
  render() {
    return (
      <div>
        <h2>成本设置</h2>
        <Form layout="vertical">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Form.Item label="内存单价" name="memory" style={{ flex: 1, marginRight: '10px' }}>
              <Input placeholder="请输入内存单价" style={{ width: '60%' }} />
            </Form.Item>
            <Form.Item label="CPU单价" name="cpu" style={{ flex: 1 }}>
              <Input placeholder="请输入CPU单价" style={{ width: '60%' }} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Form.Item label="存储单价" name="storage" style={{ flex: 1, marginRight: '10px' }}>
              <Input placeholder="请输入存储单价" style={{ width: '60%' }} />
            </Form.Item>
            <Form.Item label="流量单价" name="bandwidth" style={{ flex: 1 }}>
              <Input placeholder="请输入流量单价" style={{ width: '60%' }} />
            </Form.Item>
          </div>
          <Form.Item>
            <Button type="primary" htmlType="submit">保存设置</Button>
          </Form.Item>
        </Form>
      </div>
    )
  }
}
