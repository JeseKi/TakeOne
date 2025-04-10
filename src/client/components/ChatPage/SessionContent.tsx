import React, { useEffect, useState } from 'react';
import { Card, Spin, Modal, message } from 'antd';
import { GradientButton, Markdown } from '@lobehub/ui';

import {
  GetSessionContent,
  SessionContentResponse,
  SaveAndNext,
  ChoiceResponse,
  RoundResponse,
  MajorChoice,
  MajorChoiceRequest,
  GetReportResponse,
  GetChoicesResponse,
  GetRoundResponse
} from '../../Api';
import BaseInformationPanel from '../BaseInfomation';
import RoundList from './RoundList';
interface SessionContentProps {
  session_id: string;
  accessToken: string;
}

const SessionContent: React.FC<SessionContentProps> = ({ session_id, accessToken }) => {
  const [sessionData, setSessionData] = useState<SessionContentResponse | null>(null);
  const [rounds, setRounds] = useState<RoundResponse[]>([]);
  const [latestChoices, setLatestChoices] = useState<[ChoiceResponse, ChoiceResponse]>([{} as ChoiceResponse, {} as ChoiceResponse]);
  const [loadingChoices, setLoadingChoices] = useState(false);
  const [activeRoundIndex, setActiveRoundIndex] = useState(0);
  const [report, setReport] = useState<GetReportResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [baseInfo, setBaseInfo] = useState<any>(null);

  const fetchSessionData = async () => {
    try {
      const data = await GetSessionContent(session_id, accessToken);
      setSessionData(data);
      setBaseInfo(data.base_information);
      setReport(null)
      
      if (data.rounds && data.rounds.length > 0) {
        setRounds(data.rounds);
        setActiveRoundIndex(data.rounds.length - 1);
        
        // 检查是否有报告
        if (data.report) {
          setReport(data.report);
        } else {
          // 检查最后一轮是否已完成
          const lastRound = data.rounds[data.rounds.length - 1];
          if (lastRound.status === 'COMPLETED') {
            // 如果已完成，不自动获取新的轮次，等待用户操作
            console.log('最后一轮已完成，等待用户操作');
          } else {
            // 如果未完成，检查是否有未完成的选择
            const unfinishedChoices = lastRound.appearances.filter(a => a.is_winner_in_comparison === null);
            if (unfinishedChoices.length >= 2) {
              // 如果有未完成的选择，设置为当前选择
              setLatestChoices([unfinishedChoices[0], unfinishedChoices[1]] as [ChoiceResponse, ChoiceResponse]);
            } else {
              // 如果没有未完成的选择，不自动获取新选项
              console.log('没有未完成的选择，等待用户操作');
            }
          }
        }
      } else {
        // 如果没有轮次，创建第一轮
        await handleGetRound();
      }
    } catch (error) {
      console.error('获取会话数据失败', error);
      message.error('获取会话数据失败');
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, [session_id, accessToken]);
  
  const handleGetRound = async () => {
    try {
      setLoadingChoices(true);
      const response = await SaveAndNext(session_id, { choices: null }, accessToken);
      
      if (response.operation === 'GENERATE_ROUND') {
        const roundData = response.data as GetRoundResponse;
        setLatestChoices(roundData.choices);
        
        const newRound: RoundResponse = {
          round_number: roundData.current_round_number,
          status: 'ACTIVE',
          current_round_majors: roundData.current_round_majors,
          appearances: roundData.choices
        };
        
        setRounds(prev => [...prev, newRound]);
        setActiveRoundIndex(rounds.length);
      } else if (response.operation === 'GENERATE_REPORT') {
        const reportData = response.data as GetReportResponse;
        setReport(reportData);
      }
      
      setLoadingChoices(false);
    } catch (error) {
      console.error('获取新一轮失败', error);
      setLoadingChoices(false);
    }
  };
  
  const handleSelectChoice = async (selectedChoice: ChoiceResponse, otherChoice: ChoiceResponse) => {
    try {
      setLoadingChoices(true);
      
      // 创建选择请求
      const choice1: MajorChoice = {
        major_id: selectedChoice.major_id,
        is_winner_in_comparison: true
      };
      
      const choice2: MajorChoice = {
        major_id: otherChoice.major_id,
        is_winner_in_comparison: false
      };
      
      const request: MajorChoiceRequest = {
        choices: [choice1, choice2]
      };
      
      // 调用新的集成API
      const response = await SaveAndNext(session_id, request, accessToken);
      
      // 处理返回结果
      if (response.status === 'success') {
        // 根据操作类型更新UI
        if (response.operation === 'GENERATE_CHOICES') {
          const choicesResponse = response.data as GetChoicesResponse;
          setLatestChoices(choicesResponse.choices);
          
          // 更新rounds状态中的appearances数组
          setRounds(prev => {
            const newRounds = [...prev];
            if (newRounds.length > 0) {
              const lastRound = newRounds[newRounds.length - 1];
              
              // 检查是否已经存在相同的选项
              const existingChoice1 = lastRound.appearances.find(a => a.major_id === choicesResponse.choices[0].major_id);
              const existingChoice2 = lastRound.appearances.find(a => a.major_id === choicesResponse.choices[1].major_id);
              
              // 如果不存在，则添加到appearances数组中
              if (!existingChoice1 && !existingChoice2) {
                lastRound.appearances = [...lastRound.appearances, choicesResponse.choices[0], choicesResponse.choices[1]];
              }
            }
            return newRounds;
          });
        } else if (response.operation === 'GENERATE_ROUND') {
          const roundData = response.data as GetRoundResponse;
          setLatestChoices(roundData.choices);
          
          const newRound: RoundResponse = {
            round_number: roundData.current_round_number,
            status: 'ACTIVE',
            current_round_majors: roundData.current_round_majors,
            appearances: roundData.choices
          };
          
          setRounds(prev => [...prev, newRound]);
          setActiveRoundIndex(rounds.length);
        } else if (response.operation === 'GENERATE_REPORT') {
          const reportData = response.data as GetReportResponse;
          setReport(reportData);
          message.success('已生成最终报告');
        }
        
        // 重新获取完整的会话数据，确保所有轮次信息都是最新的
        await fetchSessionData();
      } else {
        message.error('操作失败');
      }
      
      setLoadingChoices(false);
    } catch (error) {
      console.error('选择失败', error);
      setLoadingChoices(false);
      message.error('选择失败');
    }
  };
  
  const renderReport = () => {
    if (!report) return '';
    
    let reportContent = '';
    
    reportContent += '### 最终三个专业\n\n';
    
    report.final_three_majors.forEach((major, index) => {
      reportContent += `#### ${major}\n\n${report.final_three_majors_report[index]}\n\n`;
    });
    
    reportContent += '### 最终推荐\n\n';
    // 处理文本，移除开头的空格、制表符和可能导致被解析为代码块的格式
    const processedRecommendation = report.final_recommendation
      .replace(/^(\s{4}|\t)+/gm, '') // 移除每行开头的4个空格或制表符
      .replace(/```/g, ''); // 移除可能存在的代码块标记
    reportContent += processedRecommendation;
    
    return reportContent;
  };
  
  if (!sessionData) {
    return <div className="flex justify-center items-center h-screen w-full"><Spin size="large" tip="加载中..." /></div>;
  }

  return (
    <div className="p-5 w-full max-w-[1000px] mx-auto">
      <RoundList
        rounds={rounds}
        isLoading={loadingChoices}
        latestChoices={latestChoices}
        onSelectChoice={handleSelectChoice}
        activeRoundIndex={activeRoundIndex}
        isSessionFinished={sessionData?.status === "FINISHED" || !!report}
      />

      <div className="w-full flex flex-col items-center">
        <GradientButton 
          onClick={() => setShowModal(true)}
          className="fixed right-[15%] top-[1%] z-10"
        >
          查看基本信息
        </GradientButton>
        {report && (
          <div className="mb-24 w-full md:w-3/4 lg:w-1/2 shadow-md">
            <Card className="text-left">
              <Markdown>{renderReport()}</Markdown>
            </Card>
          </div>
        )}
      </div>

      <Modal
        title="基本信息"
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        width={800}
      >
        <BaseInformationPanel 
          base_information={baseInfo} 
          accessToken={accessToken}
          submit_event={() => {}}
        />
      </Modal>
    </div>
  );
};

export default SessionContent;