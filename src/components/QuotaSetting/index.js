import React, { Component } from 'react'
import { Table, Button, Modal, Input, Form, InputNumber, Row, Col, notification } from 'antd'
import { manualRecharge, getUserList } from '@/api'
import moment from 'moment'

export default class index extends Component {
  constructor(props) {
    super(props)
    this.state = {
      userList: [],
      page: 1,
      pageSize: 20,
      name: '',
      total: 0,
      modalVisible: false,
      selectedUser: null,
      loading: true,
      amount: null,
      remark: '',
    }
  }

  componentDidMount() {
    this.loadUser()
  }
  
  loadUser = () => {
    const { page, pageSize, name } = this.state;
    this.setState({ loading: true });
    getUserList({
      page,
      page_size: pageSize,
      name: name || '',
    }).then(res => {
      if (res?.data) {
        this.setState({ 
          userList: res.data.data.users || [], 
          total: res.data.data.total || 0, 
          loading: false 
        });
      }
    }).catch(err => {
      notification.error({
        message: '获取用户列表失败',
        description: err.message
      });
      this.setState({ loading: false, userList: [], total: 0 });
    });
  };

  handleRecharge = (item, record) => {
    this.setState({
      modalVisible: true,
      selectedUser: record,
    });
  }

  handleModalOk = (values) => {
    const { amount, remark } = values;
    const { selectedUser } = this.state;
    manualRecharge({
      user_id: selectedUser.user_id,
      amount: amount * 1000000,
      description: remark,
    }).then(res => {
      if (res) {
        this.setState({ modalVisible: false });
        notification.success({
          message: '充值成功',
        });
      }
    }).catch(() => {
      notification.error({
        message: '充值失败',
        description: '请稍后再试'
      });
      this.setState({ modalVisible: false });
    })
  }

  handleModalCancel = () => {
    this.setState({ modalVisible: false, selectedUser: null });
  }
  onNameChange = (e) => {
    this.setState({ name: e.target.value });
  }
  handleExpenseSearch = () => {
    this.loadUser();
  }
  handleExpenseReset = () => {
    this.setState({ name: '' }, () => {
      this.loadUser();
    });
  }

  render() {
    const { userList, page, pageSize, total, modalVisible, selectedUser, name, loading } = this.state;
    this.formRef = React.createRef();

    const columns = [
      {
        title: '用户名称',
        dataIndex: 'username',
        rowKey: 'username',
        align: 'center',
        render: (val) => (
          <span>
            {val || '-'}
          </span>
        )
      },
      {
        title: '姓名',
        dataIndex: 'real_name',
        rowKey: 'real_name',
        align: 'center',
        render: (val) => (
          <span>
            {val || '-'}
          </span>
        )
      },
      {
        title: '电话',
        dataIndex: 'phone',
        rowKey: 'phone',
        align: 'center',
        render: (val) => (
          <span>
            {val || '-'}
          </span>
        )
      },
      {
        title: '邮箱',
        dataIndex: 'email',
        rowKey: 'email',
        align: 'center',
        render: (val) => (
          <span>
            {val || '-'}
          </span>
        )
      },
      {
        title: '创建时间',
        dataIndex: 'create_time',
        rowKey: 'create_time',
        align: 'center',
        render: val => {
          return (
            <span>
              {moment(val)
                .locale('zh-cn')
                .format('YYYY-MM-DD HH:mm:ss')}
            </span>
          );
        }
      },
      {
        title: '余额',
        dataIndex: 'balance',
        rowKey: 'balance',
        align: 'center',
        render: val => {
          const balance = (val / 1000000).toFixed(2) || '0';
          return (
            <span style={{ 
              color: '#1890ff',
              fontSize: '15px',
              fontWeight: 500
            }}>
              ¥{balance}
            </span>
          );
        }
      },
      {
        title: '操作',
        dataIndex: 'user_id',
        align: 'center',
        rowKey: 'user_id',
        render: (item, record) => {
          return <Button type="link" onClick={() => {
            this.handleRecharge(item, record)
          }}>充值</Button>
        }
      }
    ];
    return (
      <>
        <Row style={{ marginBottom: 20 }}>
          <Col span={20}>
            <Input placeholder="请输入用户名称" onChange={this.onNameChange} value={name} style={{ width: 250 }} />
          </Col>
          <Col span={4} style={{ textAlign: 'right' }}>
            <Button type="primary" onClick={this.handleExpenseSearch} style={{ marginRight: 10 }}>搜索</Button>
            <Button onClick={this.handleExpenseReset}>重置</Button>
          </Col>
        </Row>
        <Table
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: this.onPageChange,
            showQuickJumper: true,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onShowSizeChange: this.onPageChange,
            hideOnSinglePage: total <= 20
          }}
          dataSource={userList}
          columns={columns}
        />
        <Modal
          title={`您正在给名为 ${selectedUser ? selectedUser.nick_name : ''} 的用户充值金额`}
          visible={modalVisible}
          onCancel={this.handleModalCancel}
          onOk={() => this.formRef.current.submit()}
          destroyOnClose={true}
          closable={false}
        >
          <Form
            ref={this.formRef}
            layout="vertical"
            onFinish={this.handleModalOk}
            initialValues={{
              amount: this.state.amount,
              remark: this.state.remark
            }}
          >
            <Form.Item
              label="充值金额"
              name="amount"
              rules={[{ required: true, message: '请输入充值金额' }]}
            >
              <InputNumber
                min={0.01}
                step={0.01}
                style={{ width: '100%' }}
                placeholder="请输入充值金额"
                addonAfter="¥"
              />
            </Form.Item>
            <Form.Item
              label="备注信息"
              name="remark"
              rules={[{ required: true, message: '请输入备注信息' }]}
            >
              <Input
                placeholder="请输入备注信息"
              />
            </Form.Item>
          </Form>
        </Modal>
      </>
    )
  }
}
