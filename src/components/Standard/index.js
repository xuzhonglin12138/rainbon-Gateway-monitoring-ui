import React, { Component } from 'react';
import { Typography, Card, Input, Select, Spin, notification } from 'antd';
import { getPricingConfig } from '@/api';
import styles from './index.less';

const { Title, Text } = Typography;

export default class Recharge extends Component {
  constructor(props) {
    super(props);
    this.state = {
      memory: 1,
      cpu: 1,
      storage: 10,
      traffic: 100,
      duration: 1,
      timeUnit: 'month',
      pricingLoading: true
    };
  }

  componentDidMount() {
    this.getPricingConfig();
  }
  // 获取价格配置
  getPricingConfig = () => {
    getPricingConfig().then(res => {
      this.setState({
        pricingConfig: res.data,
        pricingLoading: false
      });
    }).catch(err => {
      notification.error({
        message: '获取价格配置失败',
        description: err.message
      });
      this.setState({
        pricingConfig: {},
        pricingLoading: false
      });
    });
  }

  calculateTotal = () => {
    const { memory, cpu, storage, traffic, duration, timeUnit, pricingConfig } = this.state;

    // 基础小时费率计算
    const hourlyRate = (
      memory * (pricingConfig?.memory_price_per_mb || 0) +
      cpu * (pricingConfig?.cpu_price_per_core || 0) +
      storage * (pricingConfig?.storage_price_per_gb || 0) +
      traffic * (pricingConfig?.network_price_per_mb || 0) / (24 * 30) // 将流量费用平均到每小时
    );

    // 根据不同时间单位计算总时长（小时）
    let totalHours;
    switch (timeUnit) {
      case 'year':
        totalHours = duration * 24 * 365; // 年转小时
        break;
      case 'month':
        totalHours = duration * 24 * 30; // 月转小时
        break;
      case 'day':
        totalHours = duration * 24; // 天转小时
        break;
      case 'hour':
        totalHours = duration; // 直接使用小时
        break;
      default:
        totalHours = duration * 24 * 30; // 默认按月计算
    }

    // 计算总费用
    return (hourlyRate * totalHours).toFixed(2);
  }

  handleInputChange = (field, value) => {
    this.setState({ [field]: value });
  }

  render() {
    const { memory, cpu, storage, traffic, duration, timeUnit, pricingConfig, pricingLoading } = this.state;
    const priceCards = [
      { title: '内存', subtitle: '每GB/小时价格', price: `¥${pricingConfig?.memory_price_per_mb || '0'}` },
      { title: 'CPU', subtitle: '每Core/小时价格', price: `¥${pricingConfig?.cpu_price_per_core || '0'}` },
      { title: '存储', subtitle: '每GB/小时价格', price: `¥${pricingConfig?.storage_price_per_gb || '0'}` },
      { title: '流量', subtitle: '每MB/小时价格', price: `¥${pricingConfig?.network_price_per_mb || '0'}` },
    ];

    const selectAfter = (
      <Select
        value={timeUnit}
        onChange={value => this.handleInputChange('timeUnit', value)}
        options={[
          { value: 'year', label: '年' },
          { value: 'month', label: '月' },
          { value: 'day', label: '天' },
          { value: 'hour', label: '时' },
        ]}
      />
    );

    return (
      <div className={styles.container}>
        <Title level={2}>计费标准</Title>
        <Text type="secondary">用于计量计费费用的计费标准。</Text>
        {pricingLoading ? (
          <div className={styles.loading}>
            <Spin />
          </div>
        ) : (
          <div className={styles.priceCards}>
            {priceCards.map((card, index) => (
              <Card key={index} className={styles.priceCard}>
                <Title level={4}>{card.title}</Title>
                <Text type="secondary">{card.subtitle}</Text>
                <Title level={3}>{card.price}</Title>
              </Card>
            ))}
          </div>
        )}

        {!pricingLoading &&
          <div className={styles.calculator}>
            <Title level={3}>价格计算器</Title>
            <Text type="secondary">根据您的需求估算价格</Text>

            <div className={styles.inputs}>
              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <Text>内存 (GB)</Text>
                  <Input value={memory} onChange={e => this.handleInputChange('memory', e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <Text>CPU (Core)</Text>
                  <Input value={cpu} onChange={e => this.handleInputChange('cpu', e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <Text>存储 (GB)</Text>
                  <Input value={storage} onChange={e => this.handleInputChange('storage', e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <Text>流量 (M)</Text>
                  <Input value={traffic} onChange={e => this.handleInputChange('traffic', e.target.value)} />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <Text>使用时长</Text>
                <Input
                  value={duration}
                  onChange={e => this.handleInputChange('duration', e.target.value)}
                  addonAfter={selectAfter}
                  style={{ width: '24%' }}
                />
              </div>
            </div>

            <div className={styles.total}>
              <Text>总计:</Text>
              <Title level={2}>¥{this.calculateTotal()}</Title>
            </div>
          </div>
        }
      </div>
    );
  }
}
