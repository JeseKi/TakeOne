import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import SessionsList from '../../components/ChatPage/SessionsList';
import BaseInformationPanel from '../../components/BaseInfomation';
import SessionContent from '../../components/ChatPage/SessionContent';

import "./Chat.css"

interface ChatsNavProps {
    accessToken: string;
}

const Chat: React.FC<ChatsNavProps> = (props) => {
    const { accessToken } = props;
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        if (location.pathname === '/chat') {
            searchParams.get('session') && setSessionId(searchParams.get('session'));
        }
    }, [searchParams]);

    return (
        <div id='chat-container'>
            <div id='chats-nav'>
                <SessionsList accessToken={accessToken} setSessionId={setSessionId}/>
            </div>
            <div id='session_content'>
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