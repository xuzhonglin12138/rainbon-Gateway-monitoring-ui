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
      closable={true}
      closeIcon={<span className={styles.closeIcon}>×</span>}
    >
      <div>
        <div className={styles.summary}>
          <div>
            <div>总金额</div>
            <p>-{detailData?.summary?.total_cost ? (detailData?.summary?.total_cost / 1000000).toFixed(6) : 0}</p>
          </div>
          <div>
            <div>CPU费用</div>
            <p>-{detailData?.summary?.cpu_cost ? (detailData?.summary?.cpu_cost / 1000000).toFixed(6) : 0}</p>
          </div>
          <div>
            <div>内存费用</div>
            <p>-{detailData?.summary?.memory_cost ? (detailData?.summary?.memory_cost / 1000000).toFixed(6) : 0}</p>
          </div>
          <div>
            <div>存储费用</div>
            <p>-{detailData?.summary?.storage_cost ? (detailData?.summary?.storage_cost / 1000000).toFixed(6) : 0}</p>
          </div>
          <div>
            <div>网络费用</div> 
            <p>-{detailData?.summary?.network_cost ? (detailData?.summary?.network_cost / 1000000).toFixed(6) : 0}</p>
          </div>
        </div>
        <Table
          scroll={{ x: 1500 }}
          columns={[
            { title: '组件名称', dataIndex: 'service_name', key: 'service_name', width: 220, fixed: 'left' },
            { title: 'CPU(Core)', dataIndex: 'cpu_usage', key: 'cpu_usage', width: 120,
              render: (text) => `${text ? text.toFixed(2) : 0}`},
            { title: 'CPU金额', dataIndex: 'cpu_cost', key: 'cpu_cost', width: 150,
              render: (text) => `-${text ? (text / 1000000).toFixed(6) : 0}` },
            { title: '内存(GB)', dataIndex: 'memory_usage', key: 'memory_usage', width: 120,
              render: (text) => `${text ? (text / 1024).toFixed(2) : 0}`},
            { title: '内存金额', dataIndex: 'memory_cost', key: 'memory_cost', width: 150,
              render: (text) => `-${text ? (text / 1000000).toFixed(6) : 0}` },
            { title: '存储(GB)', dataIndex: 'storage_usage', key: 'storage_usage', width: 120,
              render: (text) => `${text ? text.toFixed(6) : 0}` },
            { title: '存储金额', dataIndex: 'storage_cost', key: 'storage_cost', width: 150,
              render: (text) => `-${text ? (text / 1000000).toFixed(6) : 0}` },
            { title: '网络(MB)', dataIndex: 'network_usage', key: 'network_usage', width: 120,
              render: (text) => `${text ? text.toFixed(2) : 0}` },
            { title: '网络金额', dataIndex: 'network_cost', key: 'network_cost', width: 150,
              render: (text) => `-${text ? (text / 1000000).toFixed(6) : 0}` },
            { title: '总金额', dataIndex: 'total_cost', key: 'total_cost', width: 150, fixed: 'right',
              render: (text) => `-${text ? (text / 1000000).toFixed(6) : 0}` },
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