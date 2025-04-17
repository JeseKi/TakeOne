import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Modal } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { GetSessionsID } from '../Api';

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
    const [sessionsId, setSessionsId] = useState<string[] | null>(null);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [sessionsError, setSessionsError] = useState<string | null>(null);

    useEffect(() => {
        if (location.pathname === '/chat') {
            searchParams.get('session') && setSessionId(searchParams.get('session'));
        }
    }, [searchParams]);

    const fetchSessions = async (accessToken: string, setSessionsId: React.Dispatch<React.SetStateAction<string[] | null>>, setSessionsError: React.Dispatch<React.SetStateAction<string | null>>, setSessionsLoading: React.Dispatch<React.SetStateAction<boolean>>) => {
        setSessionsLoading(true);
        try {
            const res = await GetSessionsID(accessToken);
            setSessionsId(res);
            setSessionsError(null);
        } catch (err: any) {
            setSessionsId([]);
            setSessionsError(err.message || '获取会话列表失败');
        } finally {
            setSessionsLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions(accessToken, setSessionsId, setSessionsError, setSessionsLoading);
    }, [accessToken]);

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
            {sessionsId && sessionsId.length > 0 && (
                <Button
                    className={`left-1 top-1 sm:left-2 sm:top-2 xl:left-10 xl:top-4 z-30 ${styles.skSecondButton}`}
                    type="dashed"
                    shape="circle"
                    icon={<MenuOutlined />}
                    onClick={showModal}
                />
            )}

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
                    sessionsId={sessionsId}
                    loading={sessionsLoading}
                    errorMessage={sessionsError}
                    setSessionId={handleSessionSelect}
                />
            </Modal>

            { !sessionId ?
                <BaseInformationPanel 
                    accessToken={accessToken} 
                    base_information={null}
                    onSubmitSuccess={() => fetchSessions(accessToken, setSessionsId, setSessionsError, setSessionsLoading)}
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