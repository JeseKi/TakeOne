import React, { useEffect, useState } from 'react';
import { Card, Button, Modal, Divider, Tag } from 'antd';
import { InfoCircleOutlined, TrophyOutlined, StopOutlined, LoadingOutlined } from '@ant-design/icons';

import {
  RoundResponse,
  ChoiceResponse,
  MajorChoice
} from '../../Api';

interface RoundCardProps {
  round: RoundResponse;
  isLatest: boolean;
  isActive: boolean;
  latestChoices: [ChoiceResponse, ChoiceResponse] | null;
  onSelectChoice: (choice1: MajorChoice, choice2: MajorChoice) => void;
  isLoading?: boolean;
}

const RoundCard: React.FC<RoundCardProps> = ({ 
  round, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isLatest, 
  isActive, 
  latestChoices, 
  onSelectChoice,
  isLoading: externalLoading = false
}) => {
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [choice1Hover, setChoice1Hover] = useState(false);
  const [choice2Hover, setChoice2Hover] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  
  const isLoading = internalLoading || externalLoading;
  
  const advancedMajors = round.appearances.filter(a => a.is_winner_in_comparison === true).map(a => a.major_name);
  const eliminatedMajors = round.appearances.filter(a => a.is_winner_in_comparison === false).map(a => a.major_name);
  const pendingMajors = round.current_round_majors.filter(major => 
    !round.appearances.some(a => a.major_name === major && a.is_winner_in_comparison !== null)
  );
  
  const getUnselectedChoicesInActiveRound = () => {
    if (!isActive) return null;
    
    const unselectedAppearances = round.appearances.filter(a => a.is_winner_in_comparison === null);
    
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
    setInternalLoading(false);
  },[currentChoices]);

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
        {isActive && currentChoices && (
          <div className="flex justify-between items-center py-4">
            <div className="w-[45%] flex justify-center">
              <Button
                className={`w-full min-h-[100px] text-center flex flex-col justify-center relative overflow-visible transition-all duration-300 rounded-lg border border-gray-300
                ${currentChoices[0].is_winner_in_comparison === true ? 'bg-green-50 border-green-500 shadow-md shadow-green-100 -translate-y-1' : 
                  currentChoices[0].is_winner_in_comparison === false ? 'bg-gray-100 border-gray-300 text-gray-500 translate-y-[3px] opacity-70' : 
                  'bg-blue-50 border-blue-300 hover:-translate-y-1 hover:shadow-md'}`}
                disabled={currentChoices[0].is_winner_in_comparison !== null || isLoading}
                onClick={() => {
                  setInternalLoading(true);
                  onSelectChoice(
                    { major_id: currentChoices[0].major_id, is_winner_in_comparison: true },
                    { major_id: currentChoices[1].major_id, is_winner_in_comparison: false }
                  );
                }}
                onMouseEnter={() => setChoice1Hover(true)}
                onMouseLeave={() => setChoice1Hover(false)}
              >
                <div className="p-2">
                  <h3 className="m-0 p-0 text-lg">{currentChoices[0].major_name}</h3>
                  {currentChoices[0].is_winner_in_comparison === true && <TrophyOutlined style={{ color: '#52c41a' }} />}
                  {currentChoices[0].is_winner_in_comparison === false && <StopOutlined style={{ color: '#ff4d4f' }} />}
                  {isLoading && <LoadingOutlined />}
                </div>
                {choice1Hover && (
                  <div className="absolute bottom-0 left-0 transform translate-y-full w-auto p-2 bg-white border border-gray-200 rounded shadow-md z-20 text-left">
                    {currentChoices[0].description || "暂无描述"}
                  </div>
                )}
              </Button>
            </div>
            
            <div className="font-bold text-lg text-gray-500">VS</div>
            
            <div className="w-[45%] flex justify-center">
              <Button
                className={`w-full min-h-[100px] text-center flex flex-col justify-center relative overflow-visible transition-all duration-300 rounded-lg border border-gray-300
                ${currentChoices[1].is_winner_in_comparison === true ? 'bg-green-50 border-green-500 shadow-md shadow-green-100 -translate-y-1' : 
                  currentChoices[1].is_winner_in_comparison === false ? 'bg-gray-100 border-gray-300 text-gray-500 translate-y-[3px] opacity-70' : 
                  'bg-green-50 border-green-300 hover:-translate-y-1 hover:shadow-md'}`}
                disabled={currentChoices[1].is_winner_in_comparison !== null || isLoading}
                onClick={() => {
                  setInternalLoading(true);
                  onSelectChoice(
                    { major_id: currentChoices[0].major_id, is_winner_in_comparison: false },
                    { major_id: currentChoices[1].major_id, is_winner_in_comparison: true }
                  );
                }}
                onMouseEnter={() => setChoice2Hover(true)}
                onMouseLeave={() => setChoice2Hover(false)}
              >
                <div className="p-2">
                  <h3 className="m-0 p-0 text-lg">{currentChoices[1].major_name}</h3>
                  {currentChoices[1].is_winner_in_comparison === true && <TrophyOutlined style={{ color: '#52c41a' }} />}
                  {currentChoices[1].is_winner_in_comparison === false && <StopOutlined style={{ color: '#ff4d4f' }} />}
                  {isLoading && <LoadingOutlined />}
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
        
        {(!isActive || !currentChoices) && round.appearances.length > 0 && (
          <div className="flex flex-wrap gap-4 py-2">
            {round.appearances.map((appearance, index) => (
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
        {advancedMajors.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-2 text-base">晋级专业</h3>
            <div className="flex flex-wrap gap-2">
              {advancedMajors.map((major, index) => (
                <Tag key={index} color="success">
                  <TrophyOutlined /> {major}
                </Tag>
              ))}
            </div>
          </div>
        )}
        
        {eliminatedMajors.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-2 text-base">淘汰专业</h3>
            <div className="flex flex-wrap gap-2">
              {eliminatedMajors.map((major, index) => (
                <Tag key={index} color="error">
                  <StopOutlined /> {major}
                </Tag>
              ))}
            </div>
          </div>
        )}
        
        {pendingMajors.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-2 text-base">待选择专业</h3>
            <div className="flex flex-wrap gap-2">
              {pendingMajors.map((major, index) => (
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
            {round.current_round_majors.map((major, index) => (
              <Tag key={index} color={
                advancedMajors.includes(major) ? 'success' : 
                eliminatedMajors.includes(major) ? 'error' : 
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
