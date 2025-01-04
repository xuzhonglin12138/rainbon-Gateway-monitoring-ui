import axios from 'axios';
// import Cookies from 'js-cookie';

const http = axios.create({
  baseURL: '',  // 你的API地址
  timeout: 10000,  // 请求超时时间
});

// 请求拦截器
http.interceptors.request.use(
  config => {
    // 在发送请求之前做些什么：例如添加token
    // config.headers['Authorization'] = '你的token';
    // config.headers.authorization=`GRJWT ${Cookies.get('token')}`
    return config;
  },
  error => {
    // 对请求错误做些什么
    return Promise.reject(error);
  }
);

// 响应拦截器
http.interceptors.response.use(
  response => {
    // 对响应数据做点什么
    const res = {
      data: response?.data || {},
      status: response.status
    }
    // 根据你的业务处理回调
    return res;
  },
  error => {
    return Promise.reject(error);
  }
);

export default http;
