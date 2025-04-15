import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Modal } from 'antd';
import { MenuOutlined } from '@ant-design/icons';

import SessionsList from '../components/ChatPage/SessionsList';
import BaseInformationPanel from '../components/BaseInfomation';
import SessionContent from '../components/ChatPage/SessionContent';

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
        <div>
            <Button
                className="fixed top-4 left-4 z-30"
                type="primary"
                shape="circle"
                icon={<MenuOutlined />}
                onClick={showModal}
            />

            <Modal
                title="聊天记录"
                open={modalVisible}
                onCancel={hideModal}
                footer={null}
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

            <div>
                { !sessionId ?
                    <BaseInformationPanel accessToken={accessToken} base_information={null} submit_event={undefined}/>
                    :
                    <SessionContent session_id={sessionId} accessToken={accessToken} />
                }
            </div>
        </div>
    );
}

export default Chat;