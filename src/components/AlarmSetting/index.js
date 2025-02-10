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
        const { sms, threshold } = res.data.data;
        
        // 更新开关状态
        this.setState({ 
          smsEnabled: sms.enabled,  // 直接使用 enabled 值
          loading: false 
        });

        // 设置表单值
        this.state.formRef.current.setFieldsValue({
          // SMS 配置
          enabled: sms.enabled,
          provider: sms.provider,
          access_key: sms.access_key,
          secret_key: sms.secret_key,
          template_low_balance: sms.template_low_balance,
          template_overdue: sms.template_overdue,
          template_cleanup: sms.template_cleanup,
          template_recovery: sms.template_recovery,
          
          // 阈值配置
          check_interval: threshold.check_interval,
          low_balance_threshold: threshold.low_balance_threshold / 1000000,
          overdue_cleanup_days: threshold.overdue_cleanup_days,
          notify_interval: threshold.notify_interval
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
    
    // 获取当前表单所有值
    const currentValues = this.state.formRef.current.getFieldsValue();
    
    // 构造请求参数
    const params = {
      sms: {
        provider: currentValues.provider,
        access_key: currentValues.access_key,
        secret_key: currentValues.secret_key,
        sign_name: '好雨科技',  // 固定值
        template_low_balance: currentValues.template_low_balance,
        template_overdue: currentValues.template_overdue,
        template_cleanup: currentValues.template_cleanup,
        template_recovery: currentValues.template_recovery,
        enabled: values.enabled  // 只更新 enabled 状态
      },
      threshold: {
        check_interval: values.check_interval,
        low_balance_threshold: values.low_balance_threshold * 1000000,
        overdue_cleanup_days: values.overdue_cleanup_days,
        notify_interval: values.notify_interval
      }
    };

    upAlarmSettingInfo(params).then(() => {
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
    // 只更新 enabled 状态，不影响其他字段
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
          {/* 阈值配置 */}
          <Form.Item
            label="检查间隔"
            name="check_interval"
            rules={[{ required: true, message: '请输入检查间隔' }]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="请输入检查间隔"
              addonAfter="小时"
            />
          </Form.Item>

          <Form.Item
            label="余额阈值"
            name="low_balance_threshold"
            rules={[{ required: true, message: '请输入余额阈值' }]}
          >
            <InputNumber
              min={0}
              step={1}
              style={{ width: '100%' }}
              placeholder="请输入余额阈值"
              addonAfter="元"
            />
          </Form.Item>

          <Form.Item
            label="清理宽限期"
            name="overdue_cleanup_days"
            rules={[{ required: true, message: '请输入清理宽限期' }]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="请输入清理宽限期"
              addonAfter="天"
            />
          </Form.Item>

          <Form.Item
            label="通知间隔"
            name="notify_interval"
            rules={[{ required: true, message: '请输入通知间隔' }]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="请输入通知间隔"
              addonAfter="小时"
            />
          </Form.Item>

          {/* 短信配置 */}
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
