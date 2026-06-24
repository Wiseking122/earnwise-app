import { useState, useEffect } from 'react';

export interface ActivityItem {
  id: string;
  title: string;
  message: string;
  time: string;
  actionType: 'joined' | 'deposited' | 'withdrew' | 'task_completed';
}

const NIGERIAN_NAMES = [
  'Tunde', 'Sarah', 'Musa', 'Chioma', 'Ibrahim', 'Ngozi', 'Olumide', 'Amina', 
  'Emeka', 'Babajide', 'Fatima', 'Chidi', 'Yetunde', 'Yusuf', 'Chinonso', 
  'Abubakar', 'Adebayo', 'Kemi', 'Bolaji', 'Obi', 'Chukwuma', 'David', 'Grace', 
  'Blessing', 'Funmilayo', 'Kelechi', 'Tochukwu', 'Aisha', 'Haruna'
];

const NIGERIAN_CITIES = [
  'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Enugu', 'Benin City', 
  'Kaduna', 'Owerri', 'Jos', 'Abeokuta', 'Warri', 'Calabar', 'Ilorin', 'Akure', 
  'Minna', 'Yola', 'Lokoja', 'Onitsha', 'Zaria'
];

const TASKS = [
  'Instagram Like', 'TikTok Follow', 'Telegram Channel Join', 'Facebook Share', 
  'YouTube Subscribe', 'Twitter Retweet', 'Daily Check-In', 'Lucky Spin'
];

const DEPOSIT_AMOUNTS = [1000, 2000, 5000, 7000, 10000, 15000, 20000, 50000];
const WITHDRAWAL_AMOUNTS = [2500, 3000, 5000, 7500, 10000, 12500, 20000, 30000];
const TASK_AMOUNTS = [50, 100, 150, 200, 250, 350, 500];

function generateRandomActivity(): ActivityItem {
  const name = NIGERIAN_NAMES[Math.floor(Math.random() * NIGERIAN_NAMES.length)];
  const city = NIGERIAN_CITIES[Math.floor(Math.random() * NIGERIAN_CITIES.length)];
  const actionTypes: ActivityItem['actionType'][] = ['joined', 'deposited', 'withdrew', 'task_completed'];
  const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];

  let title = '';
  let message = '';

  switch (actionType) {
    case 'joined':
      title = 'New Member';
      message = `${name} just joined from ${city}`;
      break;
    case 'deposited':
      const depAmt = DEPOSIT_AMOUNTS[Math.floor(Math.random() * DEPOSIT_AMOUNTS.length)];
      title = 'Deposit';
      message = `${name} deposited ₦${depAmt.toLocaleString()} via Paystack`;
      break;
    case 'withdrew':
      const withAmt = WITHDRAWAL_AMOUNTS[Math.floor(Math.random() * WITHDRAWAL_AMOUNTS.length)];
      title = 'Payout';
      message = `${name} withdrew ₦${withAmt.toLocaleString()} to personal bank`;
      break;
    case 'task_completed':
      const taskAmt = TASK_AMOUNTS[Math.floor(Math.random() * TASK_AMOUNTS.length)];
      const taskName = TASKS[Math.floor(Math.random() * TASKS.length)];
      title = 'Task Completed';
      message = `${name} earned ₦${taskAmt} on ${taskName} task`;
      break;
  }

  return {
    id: `live-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title,
    message,
    time: 'Just now',
    actionType
  };
}

export function useLiveActivities(limitCount = 3) {
  const [activities, setActivities] = useState<ActivityItem[]>([
    { id: 'initial-1', title: 'New Member', message: 'Tunde just joined from Lagos', time: '1m ago', actionType: 'joined' },
    { id: 'initial-2', title: 'Payout', message: 'Sarah withdrew ₦5,000 to personal bank', time: '3m ago', actionType: 'withdrew' },
    { id: 'initial-3', title: 'Task Completed', message: 'Musa earned ₦150 on YouTube Subscribe task', time: '5m ago', actionType: 'task_completed' }
  ]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const tick = () => {
      setActivities((prev) => {
        const nextItem = generateRandomActivity();
        // Construct standard time-relative labels for existing elements
        const updatedPrev = prev.map((item, index) => {
          // If it was "Just now", upgrade is 1m ago, etc.
          let nextTime = item.time;
          if (item.time === 'Just now') {
            nextTime = '1m ago';
          } else if (item.time.endsWith('m ago')) {
            const min = parseInt(item.time) || 1;
            nextTime = `${min + 1}m ago`;
          }
          return { ...item, time: nextTime };
        });

        return [nextItem, ...updatedPrev].slice(0, limitCount);
      });

      // Randomized timer interval between 3 and 7 seconds (3000ms - 7000ms)
      const nextDelay = Math.floor(Math.random() * (7000 - 3000 + 1)) + 3000;
      timeoutId = setTimeout(tick, nextDelay);
    };

    // First dynamic trigger after standard delay
    const initialDelay = Math.floor(Math.random() * (7000 - 3000 + 1)) + 3000;
    timeoutId = setTimeout(tick, initialDelay);

    return () => clearTimeout(timeoutId);
  }, [limitCount]);

  return activities;
}
