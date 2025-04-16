import React, { useState, useEffect, useMemo } from 'react';
import { Button, Card, Modal, Divider, Tag } from 'antd';
import { InfoCircleOutlined, TrophyOutlined, StopOutlined } from '@ant-design/icons';

import { ChoiceResponse, RoundResponse } from '../../Api';

interface RoundCardProps {
  round: RoundResponse;
  // isLatest: boolean;
  isActive: boolean;
  latestChoices: [ChoiceResponse, ChoiceResponse] | null;
  onSelectChoice: (selectedChoice: ChoiceResponse, otherChoice: ChoiceResponse) => void;
  isLoading?: boolean;
  isSessionFinished?: boolean;
}

const RoundCard: React.FC<RoundCardProps> = ({ 
  round, 
  // isLatest, 
  isActive, 
  latestChoices, 
  onSelectChoice,
  isLoading: externalLoading = false,
  isSessionFinished = false
}) => {
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [choice1Hover, setChoice1Hover] = useState(false);
  const [choice2Hover, setChoice2Hover] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [errorState, setErrorState] = useState(false);
  
  const isLoading = internalLoading || externalLoading;
  
  const [localAdvancedMajors, setLocalAdvancedMajors] = useState<string[]>([]);
  const [localEliminatedMajors, setLocalEliminatedMajors] = useState<string[]>([]);
  const [localPendingMajors, setLocalPendingMajors] = useState<string[]>([]);
  
  // 使用useMemo缓存round数据的关键部分，优化比较逻辑
  const roundMemo = useMemo(() => ({
    appearances: round.appearances,
    current_round_majors: round.current_round_majors,
    round_number: round.round_number,
    status: round.status
  }), [
    JSON.stringify(round.appearances),
    JSON.stringify(round.current_round_majors),
    round.round_number,
    round.status
  ]);
  
  // 当round props变化时更新内部状态
  useEffect(() => {
    // 强制使用新的round数据更新本地状态
    const newAdvancedMajors = roundMemo.appearances.filter(a => a.is_winner_in_comparison === true).map(a => a.major_name);
    const newEliminatedMajors = roundMemo.appearances.filter(a => a.is_winner_in_comparison === false).map(a => a.major_name);
    const newPendingMajors = roundMemo.current_round_majors.filter(major => 
      !roundMemo.appearances.some(a => a.major_name === major && a.is_winner_in_comparison !== null)
    );
    
    // 直接更新状态，不进行比较
    setLocalAdvancedMajors(newAdvancedMajors);
    setLocalEliminatedMajors(newEliminatedMajors);
    setLocalPendingMajors(newPendingMajors);
    
  }, [roundMemo]); // 只依赖于缓存的roundMemo
  
  const getUnselectedChoicesInActiveRound = () => {
    if (!isActive) return null;
    
    const unselectedAppearances = roundMemo.appearances.filter(a => a.is_winner_in_comparison === null);
    
    if (unselectedAppearances.length === 2) {
      return [
        unselectedAppearances[0],
        unselectedAppearances[1]
      ];
    }
    
    return null;
  };
  
  const currentChoices = getUnselectedChoicesInActiveRound() || latestChoices;

  useEffect(() => {
    if (!externalLoading && internalLoading) {
      setInternalLoading(false);
    }
    
    if (externalLoading === false && errorState) {
      setErrorState(false);
    }
  }, [externalLoading, currentChoices]);
  
  const handleChoiceClick = async (isFirstOption: boolean) => {
    // 确保currentChoices不为null
    if (!currentChoices) {
      console.error('Error: No choices available to select');
      return;
    }
    
    try {
      setInternalLoading(true);
      setErrorState(false);
      
      const selectedChoice = isFirstOption ? currentChoices[0] : currentChoices[1];
      const otherChoice = isFirstOption ? currentChoices[1] : currentChoices[0];
      
      await onSelectChoice(selectedChoice, otherChoice);
      
      // 手动更新本地状态，确保详细信息立即更新
      const updatedAdvancedMajors = [...localAdvancedMajors];
      const updatedEliminatedMajors = [...localEliminatedMajors];
      const updatedPendingMajors = [...localPendingMajors];
      
      // 添加新晋级的专业
      if (!updatedAdvancedMajors.includes(selectedChoice.major_name)) {
        updatedAdvancedMajors.push(selectedChoice.major_name);
      }
      
      // 添加新淘汰的专业
      if (!updatedEliminatedMajors.includes(otherChoice.major_name)) {
        updatedEliminatedMajors.push(otherChoice.major_name);
      }
      
      // 从待选择中移除
      const newPendingMajors = updatedPendingMajors.filter(
        major => major !== selectedChoice.major_name && major !== otherChoice.major_name
      );
      
      setLocalAdvancedMajors(updatedAdvancedMajors);
      setLocalEliminatedMajors(updatedEliminatedMajors);
      setLocalPendingMajors(newPendingMajors);
      
    } catch (error) {
      console.error('Error selecting choice:', error);
      setErrorState(true);
    } finally {
      setInternalLoading(false);
    }
  };
  
  return (
    <div className={`mb-8 relative transition-all duration-300 ${!isActive ? 'after:content-[""] after:absolute after:inset-0 after:bg-white/70 after:z-10 after:rounded-lg after:pointer-events-none' : ''}`}>
      <Card
        className="rounded-lg shadow-md"
        title={`第 ${round.round_number} 轮`}
        extra={
          <Button 
            type="text" 
            icon={<InfoCircleOutlined />} 
            onClick={() => setInfoModalVisible(true)}
          />
        }
      >
        {isActive && currentChoices && !isSessionFinished && (
          <div className="flex justify-between items-center py-4">
            <div className="w-[45%] flex justify-center">
              <Button
                className={`w-full min-h-[100px] text-center flex flex-col justify-center relative overflow-visible transition-all duration-300 rounded-lg border border-gray-300
                ${currentChoices[0].is_winner_in_comparison === true ? 'bg-green-50 border-green-500 shadow-md shadow-green-100 -translate-y-1' : 
                  currentChoices[0].is_winner_in_comparison === false ? 'bg-gray-100 border-gray-300 text-gray-500 translate-y-[3px] opacity-70' : 
                  errorState ? 'bg-red-50 border-red-300 hover:bg-red-100' :
                  'bg-blue-50 border-blue-300 hover:-translate-y-1 hover:shadow-md'}`}
                disabled={currentChoices[0].is_winner_in_comparison !== null || isLoading || isSessionFinished}
                onClick={() => handleChoiceClick(true)}
                onMouseEnter={() => setChoice1Hover(true)}
                onMouseLeave={() => setChoice1Hover(false)}
              >
                <div className="p-2">
                  <h3 className="m-0 p-0 text-lg">{currentChoices[0].major_name}</h3>
                  {currentChoices[0].is_winner_in_comparison === true && <TrophyOutlined style={{ color: '#52c41a' }} />}
                  {currentChoices[0].is_winner_in_comparison === false && <StopOutlined style={{ color: '#ff4d4f' }} />}
                </div>
                {choice1Hover && (
                  <div className="absolute bottom-0 left-0 transform translate-y-full w-auto p-2 bg-white border border-gray-200 rounded shadow-md z-20 text-left">
                    {currentChoices[0].description || "暂无描述"}
                  </div>
                )}
              </Button>
            </div>
            
            <div className="w-10 flex justify-center">
              <div className="text-xl">VS</div>
            </div>
            
            <div className="w-[45%] flex justify-center">
              <Button
                className={`w-full min-h-[100px] text-center flex flex-col justify-center relative overflow-visible transition-all duration-300 rounded-lg border border-gray-300
                ${currentChoices[1].is_winner_in_comparison === true ? 'bg-green-50 border-green-500 shadow-md shadow-green-100 -translate-y-1' : 
                  currentChoices[1].is_winner_in_comparison === false ? 'bg-gray-100 border-gray-300 text-gray-500 translate-y-[3px] opacity-70' : 
                  errorState ? 'bg-red-50 border-red-300 hover:bg-red-100' :
                  'bg-blue-50 border-blue-300 hover:-translate-y-1 hover:shadow-md'}`}
                disabled={currentChoices[1].is_winner_in_comparison !== null || isLoading || isSessionFinished}
                onClick={() => handleChoiceClick(false)}
                onMouseEnter={() => setChoice2Hover(true)}
                onMouseLeave={() => setChoice2Hover(false)}
              >
                <div className="p-2">
                  <h3 className="m-0 p-0 text-lg">{currentChoices[1].major_name}</h3>
                  {currentChoices[1].is_winner_in_comparison === true && <TrophyOutlined style={{ color: '#52c41a' }} />}
                  {currentChoices[1].is_winner_in_comparison === false && <StopOutlined style={{ color: '#ff4d4f' }} />}
                </div>
                {choice2Hover && (
                  <div className="absolute bottom-0 left-0 transform translate-y-full w-auto p-2 bg-white border border-gray-200 rounded shadow-md z-20 text-left">
                    {currentChoices[1].description || "暂无描述"}
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}
        
        {(!isActive || !currentChoices || isSessionFinished) && roundMemo.appearances.length > 0 && (
          <div className="flex flex-wrap gap-4 py-2">
            {roundMemo.appearances.map((appearance, index) => (
              <div key={index} className={`w-full p-4 rounded-lg border border-gray-300 transition-all duration-300
                ${appearance.is_winner_in_comparison === true ? 'bg-green-50 border-green-500 -translate-y-[3px] shadow-md shadow-green-100' : 
                  appearance.is_winner_in_comparison === false ? 'bg-gray-100 border-gray-300 text-gray-500 opacity-80' : ''}`}>
                <div className="font-bold text-base mb-2 flex items-center">
                  {appearance.is_winner_in_comparison === true && (
                    <TrophyOutlined className="mr-2 text-green-500" />
                  )}
                  {appearance.is_winner_in_comparison === false && (
                    <StopOutlined className="mr-2 text-red-500" />
                  )}
                  {appearance.major_name}
                </div>
                <p className="text-sm text-gray-600 m-0 leading-normal z-20">{appearance.description || "暂无描述"}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
      
      <Modal
        title={`第 ${round.round_number} 轮详细信息`}
        open={infoModalVisible}
        onCancel={() => setInfoModalVisible(false)}
        footer={null}
        width={700}
      >
        {localAdvancedMajors.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-2 text-base">晋级专业</h3>
            <div className="flex flex-wrap gap-2">
              {localAdvancedMajors.map((major, index) => (
                <Tag key={index} color="success">
                  <TrophyOutlined /> {major}
                </Tag>
              ))}
            </div>
          </div>
        )}
        
        {localEliminatedMajors.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-2 text-base">淘汰专业</h3>
            <div className="flex flex-wrap gap-2">
              {localEliminatedMajors.map((major, index) => (
                <Tag key={index} color="error">
                  <StopOutlined /> {major}
                </Tag>
              ))}
            </div>
          </div>
        )}
        
        {localPendingMajors.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-2 text-base">待选择专业</h3>
            <div className="flex flex-wrap gap-2">
              {localPendingMajors.map((major, index) => (
                <Tag key={index} color="processing">
                  {major}
                </Tag>
              ))}
            </div>
          </div>
        )}
        
        <Divider />
        
        <div className="mb-5">
          <h3 className="mb-2 text-base">所有专业</h3>
          <div className="flex flex-wrap gap-2">
            {roundMemo.current_round_majors.map((major, index) => (
              <Tag key={index} color={
                localAdvancedMajors.includes(major) ? 'success' : 
                localEliminatedMajors.includes(major) ? 'error' : 
                'default'
              }>
                {major}
              </Tag>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RoundCard;
