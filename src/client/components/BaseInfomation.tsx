import { useState } from 'react';
import { Input, Button, Card } from 'antd';
import { LeftCircleOutlined, RightCircleOutlined, UpCircleOutlined } from '@ant-design/icons';

import { PostBaseInformation } from '../Api';
import { useNavigate } from 'react-router-dom';

import styles from './BaseInfomation.module.css';

// 问题配置
const questions = [
  {
    name: 'max_living_expenses_from_parents',
    label: '💰️父母可供生活费上限',
    placeholder: '1500元每月，父母每月固定转账',
  },
  {
    name: 'city_tier',
    label: '🏙主要居住地区是几线城市？',
    placeholder: '二线城市，江苏苏州',
  },
  {
    name: 'has_stable_hobby',
    label: '🤩是否有稳定的爱好？',
    placeholder: '喜欢打篮球和弹吉他，每周固定练习',
  },
  {
    name: 'enough_savings_for_college',
    label: '💰️当前积蓄是否可能不贷款供完大学四年的生活费？',
    placeholder: '我的积蓄大约能支持2年生活费，剩下需要贷款',
  },
  {
    name: 'pocket_money_usage',
    label: '💰️你平时的零花钱的用途是什么？',
    placeholder: '如：日常餐饮、交通、娱乐、学习资料等',
  },
  {
    name: 'willing_to_repeat_high_school_for_money',
    label: '💰️假如让你再读三年高三，每年都会给你的家庭免费的十万人民币，你愿意吗？',
    placeholder: '如果每年给10万，我会/不会愿意，原因是……',
  },
  {
    name: 'parents_in_public_sector',
    label: '👨👩父母是否属于体制内？',
    placeholder: '父母一方/双方在体制内/都不在体制内',
  },
  {
    name: 'self_learning_after_gaokao',
    label: '📚️在高考完后的这段时间，是否有每天自主学习的习惯？',
    placeholder: '每天坚持自学编程1小时',
  },
  {
    name: 'proactive_in_competitions',
    label: '🏁是否主动参加过竞赛？',
    placeholder: '主动参加过数学建模比赛',
  },
  {
    name: 'likes_reading_extracurricular_books',
    label: '📙平时是否喜欢阅读课外书？',
    placeholder: '喜欢看科幻小说和心理学书籍',
  },
];

// 每页显示3个问题
const stepSize = 3;
const steps = Array.from({ length: Math.ceil(questions.length / stepSize) }, (_, i) =>
  questions.slice(i * stepSize, i * stepSize + stepSize)
);

interface BaseInformation {
  max_living_expenses_from_parents: string;
  enough_savings_for_college: string;
  pocket_money_usage: string;
  willing_to_repeat_high_school_for_money: string;
  city_tier: string;
  parents_in_public_sector: string;
  has_stable_hobby: string;
  self_learning_after_gaokao: string;
  proactive_in_competitions: string;
  likes_reading_extracurricular_books: string;
  [key: string]: string;
}

interface BaseInformationProps {
  accessToken: string;
  base_information: BaseInformation | null;
}

const BaseInformationPanel: React.FC<BaseInformationProps> = (props: BaseInformationProps) => {
  const { accessToken , base_information } = props;

  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState(0);
  // const [hoverBackButton, setHoverBackButton] = useState<boolean>(false); // TODO: 文本悬浮时朝对应方向移动
  // const [hoverNextButton, setHoverNextButton] = useState<boolean>(false);

  const [formData, setFormData] = useState<BaseInformation>(() => {
    if (base_information !== null) {
      return { ...base_information };
    }
    return {
      max_living_expenses_from_parents: '',
      enough_savings_for_college: '',
      pocket_money_usage: '',
      willing_to_repeat_high_school_for_money: '',
      city_tier: '',
      parents_in_public_sector: '',
      has_stable_hobby: '',
      self_learning_after_gaokao: '',
      proactive_in_competitions: '',
      likes_reading_extracurricular_books: '',
    };
  });

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const targetElement = event.target;
    const name = targetElement.name;
    const value = targetElement.value;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  // 判断当前step的所有问题都已填写
  const isCurrentStepFilled = steps[currentStep].every(q => !!formData[q.name]?.trim());

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const session_uuid = await PostBaseInformation(formData, accessToken);
      console.log('提交成功:', formData);
      navigate(`/chat?session=${session_uuid}`);
    } catch (error) {
        console.error('提交失败:', error)
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className={`${styles.skContainer} w-4/5 sm:w-3/4 md:w-1/2 lg:w-1/3 mx-auto my-10`}>
      <Card className={styles.skCard}>
        <h1 className='text-2xl font-bold my-4'>基础信息表</h1>
        {steps[currentStep].map((q) => (
          <div key={q.name}>
            <h3 className='text-lg font-medium my-2'>{q.label}</h3>
            <Input.TextArea
              name={q.name}
              placeholder={q.placeholder}
              value={formData[q.name] || ''}
              onChange={handleChange}
              readOnly={base_information !== null}
              className={`${styles.skTextarea} text-2xl`}
              autoSize={{ minRows: 3 }}
            />
          </div>
        ))}
        <div>
          {currentStep > 0 && (
            <Button 
              className={styles.skButton} 
              onClick={handlePrev} 
              disabled={loading} 
              style={{marginRight: 16}}
            >
              <LeftCircleOutlined />
              上一步
            </Button>
          )}
          {currentStep < steps.length - 1 ? (
            <Button
              type="primary"
              className={`${isCurrentStepFilled && !loading ? styles.skButton : styles.skButtonDisabled}`}
              disabled={!isCurrentStepFilled || loading}
              onClick={handleNext}
            >
              下一步
              <RightCircleOutlined />
            </Button>
          ) : (
            <Button
              type="primary"
              loading={loading}
              className={isCurrentStepFilled && !loading ? styles.skButton : styles.skButtonDisabled}
              disabled={!isCurrentStepFilled || loading}
              onClick={handleSubmit}
            >
              提交
              <UpCircleOutlined />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

interface BaseInformationDisplayCardProps {
  base_information: BaseInformation;
}

export const BaseInformationDisplayCard: React.FC<BaseInformationDisplayCardProps> = ({ base_information }) => {
  return (
    <div className='w-full shadow-2xl'>
      <Card>
        <h1 className='text-2xl font-bold my-4'>基础信息</h1>
        {questions.map((q) => (
          <div key={q.name} className="mb-4">
            <div className="text-base font-medium text-gray-600 mb-1 flex items-center">
              <span>{q.label}</span>
            </div>
            <div className="bg-gray-50 rounded px-3 py-2 text-gray-900 border border-gray-200 min-h-[2rem]">
              {base_information?.[q.name] ? base_information[q.name] : <span className="text-gray-400">未填写</span>}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};

export default BaseInformationPanel;