import React from 'react';
import { Modal, Descriptions, Tag } from 'antd';
import moment from 'moment';

const RechargeModal = ({ visible, onClose, orderDetails }) => {

  let color = '';
  let statusText = '';
  switch (orderDetails?.status) {
    case 'SUCCESS':
      color = 'green';
      statusText = '成功';
      break;
    case 'REFUND':
      color = 'orange';
      statusText = '转入退款';
      break;
    case 'NOTPAY':
      color = 'red';
      statusText = '未支付';
      break;
    default:
      color = 'gray';
      statusText = '已关闭';
  }
  return (
    <Modal
      title="订单详情"
      visible={visible}
      onCancel={onClose}
      footer={null}
      width={1200}
    >
      <Descriptions bordered>
        <Descriptions.Item label="订单号">{orderDetails?.order_no}</Descriptions.Item>
        <Descriptions.Item label="交易时间">{moment(orderDetails?.pay_time).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
        <Descriptions.Item label="支付方式">{orderDetails?.pay_method}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={color}>{statusText}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="金额">¥{orderDetails?.amount / 100}</Descriptions.Item>
        <Descriptions.Item label="描述">{orderDetails?.description}</Descriptions.Item>
        <Descriptions.Item label="交易ID">{orderDetails?.transaction_id}</Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};

export default RechargeModal;