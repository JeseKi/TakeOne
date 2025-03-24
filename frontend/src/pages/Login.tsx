import { useEffect } from 'react';
import { GetLoginUrl } from '../Api';

function Login() {
    useEffect(() => {
      const redirectToLogin = async () => {
        try {
          const loginUrlResponse = await GetLoginUrl();
          window.location.replace(loginUrlResponse);
        } catch (error) {
          console.error("获取登录URL失败:", error);
        }
      };
  
      redirectToLogin();
    }, []);
  
    return <div>正在重定向到登录页面...</div>;
  }

export default Login;