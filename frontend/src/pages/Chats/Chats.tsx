import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Modal } from 'antd';
import { MenuOutlined } from '@ant-design/icons';

import SessionsList from '../../components/ChatPage/SessionsList';
import BaseInformationPanel from '../../components/BaseInfomation';
import SessionContent from '../../components/ChatPage/SessionContent';

interface ChatsNavProps {
    accessToken: string;
}

const Chat: React.FC<ChatsNavProps> = (props) => {
    const { accessToken } = props;
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [searchParams] = useSearchParams();
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        if (location.pathname === '/chat') {
            searchParams.get('session') && setSessionId(searchParams.get('session'));
        }
    }, [searchParams]);

    const showModal = () => {
        setModalVisible(true);
    };

    const hideModal = () => {
        setModalVisible(false);
    };

    const handleSessionSelect = (id: string | null) => {
        setSessionId(id);
        hideModal();
    };

    return (
        <div className="flex flex-row w-full h-screen overflow-hidden bg-white dark:bg-gray-900">
            {/* 移动端菜单按钮 */}
            <Button 
                className="fixed top-4 left-4 z-30 md:hidden flex items-center justify-center" 
                type="primary"
                shape="circle"
                icon={<MenuOutlined />}
                onClick={showModal}
            />

            {/* 桌面端侧边栏 - 只在中等屏幕以上显示 */}
            <div className="hidden md:block fixed left-0 w-[220px] h-full bg-gray-50 dark:bg-gray-800 overflow-y-auto py-2.5 z-20">
                <SessionsList accessToken={accessToken} setSessionId={setSessionId}/>
            </div>

            {/* 移动端模态框 */}
            <Modal
                title="聊天记录"
                open={modalVisible}
                onCancel={hideModal}
                footer={null}
                className="md:hidden"
                width="80%"
                centered
                destroyOnClose={false}
                maskClosable={true}
            >
                <div className="w-full">
                    <SessionsList 
                        accessToken={accessToken} 
                        setSessionId={handleSessionSelect}
                    />
                </div>
            </Modal>

            {/* 主内容区 */}
            <div className="flex-1 h-screen overflow-y-auto p-5 bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out w-full">
            { !sessionId ?
                <BaseInformationPanel accessToken={accessToken} base_information={null} submit_event={undefined}/>
                :
                <SessionContent session_id={sessionId} accessToken={accessToken} />
            }
            </div>
        </div>
    )
}

export default Chat;