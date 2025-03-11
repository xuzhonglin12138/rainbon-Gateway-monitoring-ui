import React, { Component } from 'react';
import { Modal, Button, notification, QRCode, Spin } from 'antd';
import { getWechatRechargeCode, getOrderStatus } from '@/api';


export default class WeChatRechargeModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      qrCode: '',
      orderNo: '',
      loading: true
    };
    this.timer = null;
  }

  componentDidMount() {
    this.getWechatRechargeCode();
  }

  componentWillUnmount() {
    this.clearTimer();
  }

  clearTimer = () => {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  getWechatRechargeStatus = () => {
    const { orderNo } = this.state;
    getOrderStatus({ order_no: orderNo }).then(res => {
      console.log(res);
      if (res?.data?.trade_state === 'SUCCESS') {
        this.clearTimer();
        notification.success({
          message: '充值成功',
          description: '您的账户已成功充值'
        });
        this.props.onClose();
        this.props.onOk();
      } else {
        this.timer = setTimeout(this.getWechatRechargeStatus, 1000);
      }
    }).catch(err => {
      console.log(err);
      this.clearTimer();
    });
  }


  getWechatRechargeCode = () => {
    this.setState({ loading: true });
    const { customAmount } = this.props;
    getWechatRechargeCode({
      amount: customAmount * 1000000,
      description: '充值'
    }).then(res => {
      this.setState({
        qrCode: res.data.code_url,
        orderNo: res.data.order_no,
        loading: false
      }, () => {
        this.getWechatRechargeStatus();
      });
    }).catch(err => {
      console.log(err);
      notification.error({
        message: '获取微信充值二维码失败',
        description: err.message
      });
    });
  }

  render() {
    const { visible, onClose, customAmount } = this.props;
    const { qrCode, orderNo, loading } = this.state;

    return (
      <Modal
        title="微信充值"
        visible={visible}
        onCancel={onClose}
        closable={false}
        footer={[
          <Button key="cancel" onClick={onClose}>
            取消
          </Button>
        ]}
      >
        <p>充值金额：{customAmount} 元</p>
        <p>订单号：{orderNo}</p>
        <p>请使用微信扫描以下二维码进行充值。</p>
        <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 20 }}>
          {loading ? <Spin /> : <QRCode value={qrCode} />}
        </div>
      </Modal>
    );
  }
}
