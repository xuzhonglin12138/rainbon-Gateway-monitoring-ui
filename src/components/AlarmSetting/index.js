import React, { Component } from 'react'
import { Button, Input, Form, InputNumber, Switch, Select, notification } from 'antd'
import { getAlarmSettingInfo, upAlarmSettingInfo } from '@/api'
const { Option } = Select;

export default class index extends Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: false,
      smsEnabled: false,  // 是否启用短信告警
      formRef: React.createRef(), // 添加表单引用
    }
  }

  componentDidMount() {
    this.getAlarmSettings();
  }

  // 获取告警设置信息
  getAlarmSettings = async () => {
    this.setState({ loading: true });
    getAlarmSettingInfo().then(res => {
      if (res?.data) {
        const { 
          enabled,
          minBalance,
          remainDay,
          provider,
          access_key,
          secret_key,
          template_low_balance,
          template_overdue,
          template_cleanup,
          template_recovery,
        } = res.data.data;
        // 确保 enabled 为布尔值
        const smsEnabled = !!enabled;  // 将 enabled 转换为布尔值
        // 先更新 state 中的开关状态
        this.setState({ 
          smsEnabled,  // 直接使用布尔值
          loading: false 
        });

        // 再设置表单值
        this.state.formRef.current.setFieldsValue({
          enabled: smsEnabled,  // 确保 enabled 为布尔值
          minBalance: minBalance || 0,
          remainDay: remainDay || 1,
          provider: provider || 'aliyun',
          access_key,
          secret_key,
          template_low_balance,
          template_overdue,
          template_cleanup,
          template_recovery,
        });
      } else {
        this.setState({ 
          loading: false,
          smsEnabled: false 
        });
        this.state.formRef.current.resetFields();
      }
    }).catch(err => {
      notification.error({
        message: '获取告警设置失败',
        description: err.message
      });
      this.setState({ 
        loading: false,
        smsEnabled: false
      });
      this.state.formRef.current.resetFields();
    });
  }

  // 处理表单提交
  handleModalOk = async (values) => {
    this.setState({ loading: true });
    values.sign_name = '好雨科技'
    upAlarmSettingInfo(values).then(() => {
      notification.success({
        message: '保存成功'
      });
      // 重新获取最新数据
      this.getAlarmSettings();
    }).catch(err => {
      notification.error({
        message: '保存告警设置失败',
        description: err.message
      });
      this.setState({ loading: false });
    });
  }

  // 处理 Switch 状态变化
  handleSwitchChange = (checked) => {
    this.setState({ smsEnabled: checked });
    this.state.formRef.current.setFieldsValue({ enabled: checked });
  }

  render() {
    const { loading, smsEnabled, formRef } = this.state;
    const formItemStyle = { width: '100%', marginBottom: '8px' };
    return (
      <div style={{ width: '400px' }}>
        <Form
          ref={formRef}
          layout="vertical"
          onFinish={this.handleModalOk}
          disabled={loading}
        >
          <Form.Item
            label="最小余额"
            name="minBalance"
            rules={[{ required: true, message: '请输入最小余额' }]}
          >
            <InputNumber
              min={0}
              step={1}
              style={{ width: '100%' }}
              placeholder="请输入最小余额"
              addonAfter="¥"
            />
          </Form.Item>

          <Form.Item
            label="欠费宽限期"
            name="remainDay"
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
            name="enabled"
          >
            <Switch 
              checked={smsEnabled}
              onChange={this.handleSwitchChange}
            />
          </Form.Item>

          {smsEnabled && (
            <>
              <Form.Item
                label="短信服务提供商"
                name="provider"
                rules={[{ required: true, message: '请选择短信服务提供商' }]}
              >
                <Select placeholder="请选择短信服务提供商">
                  <Option value="aliyun">阿里云</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="AccessKey"
                name="access_key"
                rules={[{ required: true, message: '请输入AccessKey' }]}
              >
                <Input placeholder="请输入AccessKey" />
              </Form.Item>

              <Form.Item
                label="SecretKey"
                name="secret_key"
                rules={[{ required: true, message: '请输入SecretKey' }]}
              >
                <Input.Password placeholder="请输入SecretKey" />
              </Form.Item>
              <h4>短信通知模版ID配置</h4>
              <Form.Item
                label="余额不足模版"
                name="template_low_balance"
              >
                <Input 
                  placeholder="请输入余额不足模版ID" 
                  style={formItemStyle}
                />
              </Form.Item>

              <Form.Item
                label="欠费通知模版"
                name="template_overdue"
              >
                <Input 
                  placeholder="请输入欠费通知模版ID" 
                  style={formItemStyle}
                />
              </Form.Item>

              <Form.Item
                label="清理预警模版"
                name="template_cleanup"
              >
                <Input 
                  placeholder="请输入清理预警模版ID" 
                  style={formItemStyle}
                />
              </Form.Item>

              <Form.Item
                label="恢复通知模版"
                name="template_recovery"
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
