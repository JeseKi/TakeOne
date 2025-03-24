import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css'
import { useEffect } from 'react';

import BaseInformation from './pages/BaseInfomation';
import Callback from './pages/Callback';
import { GetLoginUrl, GetUserInfo } from './Api';
import { Chat } from './pages/Chat/Chats';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = localStorage.getItem('access_token');

  useEffect(() => {

    if (location.pathname === '/callback') {
      return;
    }

    if (location.pathname === '/login') {
      const redirectToLogin = async () => {
        try {
          const loginUrlResponse = await GetLoginUrl();
          window.location.replace(loginUrlResponse);
        } catch (error) {
          console.error("获取登录URL失败:", error);
        }
      };

      redirectToLogin();
    }

  }, [location.pathname, accessToken]);
    
  const verifyTokenAndFetchUserInfo = async (access_token: string) => {
    try {
      await GetUserInfo(access_token);

    } catch (error: any) {
      console.error('Token 验证或获取用户信息失败', error);
      
      localStorage.removeItem('access_token');
      localStorage.removeItem('userInfo');
      navigate('/login');

      return (
        <div>
          <h2>Token 验证或获取用户信息失败</h2>
          <p>请重新登录。</p>
          <p>正在重定向到登录页面...</p>
        </div>
      )
    }
  };

  if (!accessToken) {
    navigate('/login');
    return (<>正在重定向到登录页面...</>);
  }
  else {
    verifyTokenAndFetchUserInfo(accessToken);
  }

  return (
      <Routes>
        <Route path='/' element={<Chat accessToken={accessToken} />} />
        <Route path='base_information' element={<BaseInformation accessToken={accessToken} />} />
        <Route path='callback' element={<Callback />} />
        <Route path='login' element={<>正在重定向到登录页面...</>} />
        <Route path='/chat/*' element={<Chat accessToken={accessToken} />} />
      </Routes>
  )
}

export default App
