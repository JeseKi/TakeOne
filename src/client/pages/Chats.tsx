import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Modal } from 'antd';
import { MenuOutlined } from '@ant-design/icons';

import SessionsList from '../components/ChatPage/SessionsList';
import BaseInformationPanel from '../components/BaseInfomation';
import SessionContent from '../components/ChatPage/SessionContent';

import styles from './Chats.module.css';

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
        <>
            <Button
                className={`left-1 top-1 sm:left-2 sm:top-2 xl:left-10 xl:top-4 z-30 ${styles.skSecondButton}`}
                type="dashed"
                shape="circle"
                icon={<MenuOutlined />}
                onClick={showModal}
            />

            <Modal
                title="会话记录"
                open={modalVisible}
                onCancel={hideModal}
                footer={null}
                width={800}
                centered
                destroyOnClose={false}
                maskClosable={true}
            >
                <SessionsList
                    accessToken={accessToken}
                    setSessionId={handleSessionSelect}
                />
            </Modal>

            { !sessionId ?
                <BaseInformationPanel 
                    accessToken={accessToken} 
                    base_information={null}
                />
                :
                <SessionContent 
                    session_id={sessionId} 
                    accessToken={accessToken} 
                />
            }
        </>
    );
}

export default Chat;