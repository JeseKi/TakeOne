import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { List } from '@lobehub/ui';

import { SessionsList } from './SessionsList';
import BaseInformationPanel from '../BaseInfomation';

import "./Chat.css"
import SessionContent from './SessionContent';

interface ChatsNavProps {
    accessToken: string;
}

const Chat: React.FC<ChatsNavProps> = (props) => {
    const { accessToken } = props;
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [searchParams] = useSearchParams();
    
    const navigate = useNavigate();

    useEffect(() => {
        if (location.pathname === '/chat') {
            searchParams.get('session') && setSessionId(searchParams.get('session'));
        }
    }, [searchParams]);

    const handleCreateSession = () => {
        navigate('/');
        setSessionId(null);
    }

    return (
        <div id='chat-container'>
            <div id='chats-nav'>
                <List.Item id='session_item' title={"创建新对话"} onClick={() => handleCreateSession()}/>
                <hr />
                <SessionsList accessToken={accessToken} />
            </div>
            <div id='session_content'>
            { !sessionId ?
                <BaseInformationPanel accessToken={accessToken} base_information={null}/>
                :
                <SessionContent session_id={sessionId} accessToken={accessToken} />
            }
            </div>
        </div>
    )
}

export default Chat;