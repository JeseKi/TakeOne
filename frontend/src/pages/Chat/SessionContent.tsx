import  React, { useEffect, useState } from 'react';

import { Modal , GradientButton } from '@lobehub/ui';

import { GetSessionContent, SessionContentResponse } from '../../Api';
import BaseInformationPanel from '../BaseInfomation';

import './SessionContent.css'

interface SessionContentProps {
    accessToken: string;
    session_id: string;
}

const SessionContent: React.FC<SessionContentProps> = ( props ) => {
    const {session_id , accessToken} = props;
    const [sessionContent, setSessionContent] = useState<SessionContentResponse | null>(null);

    const [loading, setLoading] = useState<boolean>(true);
    const [showModal, setShowModal] = useState<boolean>(false);

    useEffect(() => {
        setLoading(true);
        GetSessionContent(session_id, accessToken).then((response) => {
            setSessionContent(response);
            setLoading(false);
        }).catch((error) => {
            console.error('获取对话内容失败', error);
        });
    }, [session_id]);

    useEffect(() => {
        console.log(sessionContent);
    }, [sessionContent]);

    if (loading || !sessionContent) {
        return <div>加载中...</div>
    }

    return (
        <div>
            <GradientButton id='base_info_modal_button' onClick={() => setShowModal(true)}>查看基本信息</GradientButton>
            <Modal title={"基本信息（无法编辑）"} 
                    open={showModal} 
                    onCancel={() => setShowModal(false)} 
                    onOk={() => setShowModal(false)} 
                    okText={"已阅"} 
                    cancelButtonProps={{disabled: true}}
                    >
                <BaseInformationPanel accessToken={accessToken} base_information={sessionContent.base_information} />
            </Modal>
            <div id='line_break'></div>
        </div>
    )
}

export default SessionContent;