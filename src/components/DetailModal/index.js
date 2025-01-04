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
    >
      <div>
        <div className={styles.summary}>
          <div>
            <p>总金额</p>
            <p>-¥{detailData?.summary?.total_cost.toFixed(2) || 0}</p>
          </div>
          <div>
            <p>CPU 费用</p>
            <p>-¥{detailData?.summary?.cpu_cost.toFixed(2) || 0}</p>
          </div>
          <div>
            <p>内存费用</p>
            <p>-¥{detailData?.summary?.memory_cost.toFixed(2) || 0}</p>
          </div>
          <div>
            <p>存储费用</p>
            <p>-¥{detailData?.summary?.storage_cost.toFixed(2) || 0}</p>
          </div>
          <div>
            <p>网络费用</p>
            <p>-¥{detailData?.summary?.network_cost.toFixed(2) || 0}</p>
          </div>
        </div>
        <Table
          columns={[
            { title: '组件名称', dataIndex: 'service_id', key: 'service_id' },
            { title: 'CPU', dataIndex: 'cpu', key: 'cpu' },
            { title: 'CPU金额', dataIndex: 'cpu_cost', key: 'cpu_cost', render: (text) => `-¥${text.toFixed(2)}` },
            { title: '内存', dataIndex: 'memory', key: 'memory' },
            { title: '内存金额', dataIndex: 'memory_cost', key: 'memory_cost', render: (text) => `-¥${text.toFixed(2)}`   },
            { title: '存储', dataIndex: 'storage', key: 'storage' },
            { title: '存储金额', dataIndex: 'storage_cost', key: 'storage_cost', render: (text) => `-¥${text.toFixed(2)}` },
            { title: '网络', dataIndex: 'network_io', key: 'network_io' },
            { title: '网络金额', dataIndex: 'network_cost', key: 'network_cost', render: (text) => `-¥${text.toFixed(2)}` },
            { title: '总金额', dataIndex: 'total_cost', key: 'total_cost', render: (text) => `-¥${text.toFixed(2)}` },
          ]}
          dataSource={detailData.service_costs}
          rowKey="componentName"
          pagination={false}
        />
      </div>
    </Modal>
  );
};

export default DetailModal;