import React, { Component } from 'react';
import { Typography, Card, Row, Col, Input, Button } from 'antd';
import styles from './index.less';
import WeChatRechargeModal from '../WeChatRechargeModal';

const { Title, Text } = Typography;

export default class Recharge extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedAmount: null,
      customAmount: '',
      isModalVisible: false,
    };
  }

  // 预设的充值金额选项
  amountOptions = [50, 100, 200, 500, 1000, '其他金额'];

  render() {
    return (
      <div className={styles.container}>
        <Title level={2}>账户充值</Title>
        <Text type="secondary">充值到您的账户余额，用于支付后续的计量计费费用。</Text>
        <div className={styles.balanceInfo}>
          <Row gutter={24}>
            <Col span={12}>
              <Card>
                <Text type="secondary">当前余额</Text>
                <div className={styles.amount}>
                  <Text strong style={{ color: '#52c41a', fontSize: '24px' }}>¥ 1000.00</Text>
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <Text type="secondary">支出金额</Text>
                <div className={styles.amount}>
                  <Text strong style={{ color: '#f5222d', fontSize: '24px' }}>¥ 500.00</Text>
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        <Title level={4}>充值金额</Title>
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
          {this.amountOptions.map(amount => (
            <Col span={6} key={amount}>
              <Card 
                className={`${styles.amountCard} ${this.state.selectedAmount === amount ? styles.selected : ''}`}
                onClick={() => {
                  if (amount === '其他金额') {
                    this.setState({ selectedAmount: '其他金额', customAmount: '' });
                  } else {
                    this.setState({ selectedAmount: amount, customAmount: amount });
                  }
                }}
                size="small"
              >
                {typeof amount === 'number' ? `¥ ${amount}` : amount}
              </Card>
            </Col>
          ))}
        </Row>

        {this.state.selectedAmount === '其他金额' && (
          <div className={styles.customAmount} style={{ marginBottom: 24 }}>
            <Input 
              placeholder="请输入充值金额" 
              prefix="¥"
              value={this.state.customAmount}
              onChange={e => this.setState({ customAmount: e.target.value })}
              type="number"
              min={0}

            />
          </div>
        )}

        <Button 
          type="primary" 
          block 
          size="large" 
          onClick={() => this.setState({ isModalVisible: true })}
          disabled={!this.state.customAmount}
        >
          确认充值
        </Button>
        { this.state.isModalVisible && (
          <WeChatRechargeModal 
            visible={this.state.isModalVisible} 
            customAmount={this.state.customAmount}
            onClose={() => this.setState({ isModalVisible: false })}
          />
        )}
      </div>
    );
  }
}
