// src/components/DetailModal.js
import React from 'react';
import { Modal, Table } from 'antd';
import styles from './index.less';

const DetailModal = ({ visible, onClose, detailData }) => {
  console.log(detailData);
  return (
    <Modal
      title="费用明细"
      visible={visible}
      onCancel={onClose}
      width={1200}
      footer={null}
      closable={false}
    >
      <div>
        <div className={styles.summary}>
          <div>
            <p>总金额（元）</p>
            <p>-¥{(detailData?.summary?.total_cost / 100).toFixed(2) || 0}</p>
          </div>
          <div>
            <p>CPU费用(元)</p>
            <p>-¥{(detailData?.summary?.cpu_cost / 100).toFixed(2) || 0}</p>
          </div>
          <div>
            <p>内存费用(元)</p>
            <p>-¥{(detailData?.summary?.memory_cost / 100).toFixed(2) || 0}</p>
          </div>
          <div>
            <p>存储费用(元)</p>
            <p>-¥{(detailData?.summary?.storage_cost / 100).toFixed(2) || 0}</p>
          </div>
          <div>
            <p>网络费用(元)</p>
            <p>-¥{(detailData?.summary?.network_cost / 100).toFixed(2) || 0}</p>
          </div>
        </div>
        <Table
          columns={[
            { title: '组件名称', dataIndex: 'service_name', key: 'service_name' },
            { title: 'CPU(Core)', dataIndex: 'cpu_usage', key: 'cpu_usage' },
            { title: 'CPU金额(元)', dataIndex: 'cpu_cost', key: 'cpu_cost', 
              render: (text) => `-¥${(text / 100).toFixed(2)}` },
            { title: '内存(MB)', dataIndex: 'memory_usage', key: 'memory_usage' },
            { title: '内存金额(元)', dataIndex: 'memory_cost', key: 'memory_cost', 
              render: (text) => `-¥${(text / 100).toFixed(2)}` },
            { title: '存储(GB)', dataIndex: 'storage_usage', key: 'storage_usage' },
            { title: '存储金额(元)', dataIndex: 'storage_cost', key: 'storage_cost', 
              render: (text) => `-¥${(text / 100).toFixed(2)}` },
            { title: '网络(MB)', dataIndex: 'network_usage', key: 'network_usage' },
            { title: '网络金额(元)', dataIndex: 'network_cost', key: 'network_cost', 
              render: (text) => `-¥${(text / 100).toFixed(2)}` },
            { title: '总金额(元)', dataIndex: 'total_cost', key: 'total_cost', 
              render: (text) => `-¥${(text / 100).toFixed(2)}` },
          ]}
          dataSource={detailData.component_details}
          rowKey="componentName"
          pagination={false}
        />
      </div>
    </Modal>
  );
};

export default DetailModal;