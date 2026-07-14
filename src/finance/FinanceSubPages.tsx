
import React, { useState } from 'react';
import { Contact } from '../types';
import { MobileHeader, SectionDivider } from '../Common';
import { formatWalletAmount, parseWalletAmount } from '../app/walletFlowUtils';

const FinanceServiceGrid: React.FC<{
  title: string;
  items: Array<{ icon: string; label: string; color: string }>;
}> = ({ title, items }) => (
  <div className="mx-3 mt-3 app-surface-panel overflow-hidden">
    <div className="px-4 py-3 text-[13px] text-gray-500">{title}</div>
    <div className="grid grid-cols-4 gap-y-6 pb-4">
      {items.map(item => (
        <div key={item.label} className="flex flex-col items-center">
          <i className={`fa-solid ${item.icon} text-2xl`} style={{ color: item.color }}></i>
          <span className="text-[12px] mt-2 text-gray-700 dark:text-gray-300">{item.label}</span>
        </div>
      ))}
    </div>
  </div>
);

// 支付/服务页面
export const PayView: React.FC<{ onBack: () => void; onWallet: () => void; onReceivePay: () => void; balance?: number }> = ({ onBack, onWallet, onReceivePay, balance }) => (
  <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
    <MobileHeader title="服务" onBack={onBack} actions={<button className="app-icon-button"><i className="fa-solid fa-ellipsis-h"></i></button>} />
    <div className="flex-1 overflow-y-auto">
      <div className="mx-3 mt-3 rounded-2xl p-5 shadow-lg" style={{ backgroundColor: 'var(--app-accent-color)', color: '#FFFFFF' }}>
        <div className="grid grid-cols-2 gap-x-6">
          <button className="transparent flex flex-col items-center py-3 bg-white/15 rounded-xl active:bg-white/25 transition-colors" onClick={onReceivePay}>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl text-white">
              <i className="fa-solid fa-qrcode"></i>
            </div>
            <span className="text-[15px] mt-3 text-white">收付款</span>
          </button>
          <button className="transparent flex flex-col items-center py-3 bg-white/15 rounded-xl active:bg-white/25 transition-colors" onClick={onWallet}>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl text-white">
              <i className="fa-solid fa-wallet"></i>
            </div>
            <span className="text-[15px] mt-3 text-white">钱包</span>
            <span className="text-[13px] mt-1 text-white/70">¥{Number(balance ?? 0).toFixed(2)}</span>
          </button>
        </div>
      </div>

      <FinanceServiceGrid
        title="金融理财"
        items={[
          { icon: 'fa-credit-card', label: '信用卡还款', color: '#18A558' },
          { icon: 'fa-chart-line', label: '理财通', color: '#3B82F6' },
          { icon: 'fa-shield-halved', label: '保险服务', color: '#F59A23' }
        ]}
      />

      <FinanceServiceGrid
        title="生活服务"
        items={[
          { icon: 'fa-mobile-screen', label: '手机充值', color: '#3B82F6' },
          { icon: 'fa-droplet', label: '生活缴费', color: '#22C55E' },
          { icon: 'fa-city', label: '城市服务', color: '#22C55E' }
        ]}
      />

      <div className="mb-6">
        <FinanceServiceGrid
          title="交通出行"
          items={[
            { icon: 'fa-location-dot', label: '出行服务', color: '#3B82F6' },
            { icon: 'fa-train-subway', label: '火车票机票', color: '#22C55E' },
            { icon: 'fa-taxi', label: '滴滴出行', color: '#F59A23' },
            { icon: 'fa-hotel', label: '酒店民宿', color: '#22C55E' }
          ]}
        />
      </div>
    </div>
  </div>
);

// 收付款（微信风格）
export const ReceivePayView: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="fixed inset-0 z-[360] flex flex-col animate-in slide-in-from-bottom duration-300" style={{ backgroundColor: 'var(--app-accent-color)' }}>
    <MobileHeader title="收付款" onBack={onBack} className="bg-transparent border-none !text-white [&_.render-header-text]:!text-white [&_.wechat-header-btn]:!text-white" />
    <div className="flex-1 overflow-y-auto px-4 pb-6">
      <div className="mt-3 rounded-2xl bg-white dark:bg-[#191919] border border-black/5 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="px-5 pt-6 pb-5 flex flex-col items-center">
          <img src="/assets/image/barcode.png" alt="barcode" className="w-full h-28 object-contain" />

          <div className="mt-2 w-[188px] h-[188px] bg-white flex items-center justify-center overflow-hidden">
            <img src="/assets/image/qrcode.png" alt="qrcode" className="w-[160px] h-[160px] object-contain" />
          </div>
        </div>

        <div className="border-t border-[#F1F1F1] dark:border-white/10">
          <button className="w-full px-5 py-4 flex items-center justify-between active:bg-black/5 dark:active:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#07C160]/15 text-[#07C160] flex items-center justify-center text-[15px]">
                <i className="fa-solid fa-money-bill-wave"></i>
              </div>
              <span className="text-[15px] text-[#111] dark:text-white">二维码收款</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[12px] text-[#B6B6B6]"></i>
          </button>

          <button className="w-full px-5 py-4 flex items-center justify-between border-t border-[#F1F1F1] dark:border-white/10 active:bg-black/5 dark:active:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center text-[15px]">
                <i className="fa-solid fa-receipt"></i>
              </div>
              <span className="text-[15px] text-[#111] dark:text-white">设置金额</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[12px] text-[#B6B6B6]"></i>
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white dark:bg-[#191919] border border-black/5 dark:border-white/10 shadow-sm overflow-hidden">
        <button className="w-full px-5 py-4 flex items-center justify-between active:bg-black/5 dark:active:bg-white/5 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F59A23]/15 text-[#F59A23] flex items-center justify-center text-[15px]">
              <i className="fa-solid fa-address-book"></i>
            </div>
            <span className="text-[15px] text-[#111] dark:text-white">收款小账本</span>
          </div>
          <i className="fa-solid fa-chevron-right text-[12px] text-[#B6B6B6]"></i>
        </button>
      </div>
    </div>
  </div>
);

// 发红包
export const SendRedPacketView: React.FC<{ onBack: () => void, onSend: (amount: string, msg: string) => void }> = ({ onBack, onSend }) => {
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState('恭喜发财，大吉大利');
  const [type, setType] = useState<'normal' | 'random'>('random');
  const parsedAmount = parseWalletAmount(amount);
  const canSend = parsedAmount !== null;

  return (
    <div className="fixed inset-0 z-[300] render-bg-tertiary flex flex-col animate-in slide-in-from-bottom duration-300">
      <MobileHeader title="发红包" onBack={onBack} className="render-bg-tertiary border-none" />
      <div className="p-4 flex-1">
         <div className="flex justify-center mb-6">
            <div className="flex render-bg-secondary rounded-full p-1 shadow-sm border render-border-subtle">
               <button className={`app-button px-4 py-1.5 rounded-full text-sm font-medium min-h-0 ${type === 'random' ? 'app-button-primary' : 'app-button-muted'}`} onClick={() => setType('random')}>拼手气红包</button>
               <button className={`app-button px-4 py-1.5 rounded-full text-sm font-medium min-h-0 ${type === 'normal' ? 'app-button-primary' : 'app-button-muted'}`} onClick={() => setType('normal')}>普通红包</button>
            </div>
         </div>

         <div className="render-bg-secondary rounded-lg p-5 mb-4 shadow-sm border render-border-subtle">
            <div className="flex items-center justify-between">
               <div className="flex items-center">
                  <span className="bg-[#FFBE00] text-white text-[10px] px-1 rounded-sm mr-2">拼</span>
                  <span className="text-[16px] dark:text-gray-200">总金额</span>
               </div>
               <div className="flex items-center">
                  <input type="text" inputMode="decimal" placeholder="0.00" className="text-right bg-transparent outline-none text-2xl font-medium dark:text-white w-32" value={amount} onChange={e => setAmount(e.target.value)} />
                  <span className="ml-2 dark:text-gray-300">元</span>
               </div>
            </div>
         </div>
         <p className="text-[12px] text-gray-400 mb-6 px-1">当前为拼手气红包，<span className="text-link cursor-pointer" onClick={() => setType('normal')}>改为普通红包</span></p>

         <div className="render-bg-secondary rounded-lg p-5 mb-8 shadow-sm border render-border-subtle">
            <textarea placeholder="恭喜发财，大吉大利" className="w-full bg-transparent outline-none resize-none dark:text-white h-20 text-[16px]" value={msg} onChange={e => setMsg(e.target.value)} />
         </div>

         <div className="text-center flex flex-col items-center">
            <div className="flex items-baseline mb-10">
               <span className="text-2xl font-bold dark:text-white ml-1">¥</span>
               <span className="text-5xl font-bold dark:text-white ml-1">{parsedAmount === null ? '0.00' : formatWalletAmount(parsedAmount)}</span>
            </div>
                        <button 
                           className={`app-button w-full max-w-[280px] font-bold text-lg transition-all active:scale-95 shadow-lg ${canSend ? 'app-button-primary' : 'app-button-muted opacity-50 cursor-not-allowed'}`}
                           disabled={!canSend} 
                           onClick={() => onSend(amount, msg)}
                        >
                           塞钱进红包
                        </button>         </div>
      </div>
      <div className="p-4 text-center text-link text-xs pb-10">未领取的红包，将于24小时后发起退款</div>
    </div>
  );
};

// 转账
export const TransferView: React.FC<{ contact: Contact, onBack: () => void, onSend: (amount: string) => void }> = ({ contact, onBack, onSend }) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const parsedAmount = parseWalletAmount(amount);
  const canSend = parsedAmount !== null;

  return (
    <div className="fixed inset-0 z-[300] render-bg-primary flex flex-col animate-in slide-in-from-bottom duration-300">
      <MobileHeader title="" onBack={onBack} />
      <div className="p-8 flex-1 flex flex-col">
         <div className="flex flex-col items-center mb-10">
            <div className="relative mb-4">
               <img src={contact.avatar} className="w-16 h-16 rounded-md object-cover shadow-md" />
               <div className="absolute -bottom-1 -right-1 render-bg-secondary rounded-full p-0.5 border render-border-subtle">
                  <i className="fa-solid fa-circle-check text-sm" style={{ color: 'var(--app-accent-color)' }}></i>
               </div>
            </div>
            <div className="text-lg font-bold dark:text-white">向 {contact.name} 转账</div>
            <div className="text-sm text-gray-400 mt-1">账号ID: {contact.id}</div>
         </div>

         <div className="render-bg-secondary rounded-xl flex-1 flex flex-col border render-border-subtle p-4">
            <div className="text-sm text-gray-500 mb-6">转账金额</div>
            <div className="flex items-center border-b render-border-subtle pb-4 mb-6">
               <span className="text-4xl font-medium ml-4 dark:text-white">¥</span>
               <input 
                  type="text" 
                  inputMode="decimal"
                  className="flex-1 text-6xl bg-transparent outline-none dark:text-white font-medium" 
                  autoFocus 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  placeholder="0.00"
               />
            </div>
            
            {!showNote ? (
               <button type="button" className="app-button app-button-muted text-sm font-medium inline-block mb-10 !px-0 !py-0 border-none shadow-none bg-transparent" onClick={() => setShowNote(true)}>添加转账说明</button>
            ) : (
               <div className="mb-10">
                  <input 
                    autoFocus
                    className="w-full bg-transparent border-b render-border-subtle pb-2 text-sm render-text-primary outline-none focus:border-[var(--app-accent-color)]"
                    placeholder="转账说明"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
               </div>
            )}

            <div className="mt-auto">
               <button 
                  className={`app-button w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] shadow-md ${canSend ? 'app-button-primary' : 'app-button-muted opacity-60 cursor-not-allowed'}`}
                  disabled={!canSend} 
                  onClick={() => onSend(amount)}
               >
                  转账
               </button>
            </div>
         </div>
      </div>
      <div className="p-4 text-center text-gray-400 text-xs pb-10">钱将直接转入对方零钱，对方确认后即可入账</div>
    </div>
  );
};

// 收款-转账（全屏）
export const ReceiveTransferView: React.FC<{
  contact: Contact;
  amount: string;
  isOpened?: boolean;
  onBack: () => void;
  onConfirm: () => void;
}> = ({ contact, amount, isOpened = false, onBack, onConfirm }) => {
  const displayAmount = Number(amount || 0).toFixed(2);

  return (
    <div className="fixed inset-0 z-[420] bg-[#EDEDED] dark:bg-[#101010] flex flex-col animate-in slide-in-from-bottom duration-300">
      <MobileHeader title="转账" onBack={onBack} className="bg-transparent border-none" />
      <div className="flex-1 px-5 pt-4 pb-8 flex flex-col">
        <div className="bg-white dark:bg-[#181818] rounded-2xl shadow-sm border border-black/5 dark:border-white/10 p-5">
          <div className="flex flex-col items-center pt-1 pb-4">
            <img src={contact.avatar} className="w-14 h-14 rounded-lg object-cover shadow-sm" />
            <div className="mt-3 text-[16px] font-medium text-[#111] dark:text-white">{contact.name} 向你转账</div>
            <div className="mt-4 text-[#111] dark:text-white leading-none">
              <span className="text-[30px] align-middle mr-1">¥</span>
              <span className="text-[44px] font-semibold align-middle">{displayAmount}</span>
            </div>
          </div>
          <div className="border-t border-[#F0F0F0] dark:border-white/10 pt-4 text-[14px] text-[#666] dark:text-gray-300 flex items-center justify-between">
            <span>到账方式</span>
            <span className="text-[#111] dark:text-white">零钱</span>
          </div>
        </div>

        <div className="mt-auto">
          <button
            className={`app-button w-full py-3.5 text-[17px] font-semibold transition-all shadow-sm ${isOpened ? 'app-button-muted opacity-80' : 'app-button-primary active:scale-[0.99]'}`}
            onClick={onConfirm}
          >
            {isOpened ? '已收款' : '确认收款'}
          </button>
        </div>
      </div>
    </div>
  );
};

// 收款-红包（全屏）
export const ReceiveRedPacketView: React.FC<{
  contact: Contact;
  amount: string;
  content?: string;
  isOpened?: boolean;
  showResultOnly?: boolean;
  receiverName?: string;
  receiverAvatar?: string;
  receivedTime?: string;
  onBack: () => void;
  onConfirm: () => void;
}> = ({ contact, amount, content, isOpened = false, showResultOnly = false, receiverName = '我', receiverAvatar = '/assets/image/user.png', receivedTime, onBack, onConfirm }) => {
  const displayAmount = Number(amount || 0).toFixed(2);
  const safeReceivedTime = (receivedTime || '').trim() || '刚刚';

  return (
    <div className="fixed inset-0 z-[430] bg-[#F3F3F3] dark:bg-[#121212] flex flex-col animate-in fade-in duration-200 overflow-hidden">
      <div className="relative h-[104px] bg-[#F24F43] overflow-visible">
        <MobileHeader title="红包" onBack={onBack} className="bg-[#F24F43] border-none !text-[#F3F3F3] [&_.render-header-text]:!text-[#F3F3F3] [&_.wechat-header-btn]:!text-[#F3F3F3]" />
        <div className="pointer-events-none absolute -bottom-[56px] left-1/2 h-[120px] w-[165%] -translate-x-1/2 rounded-[50%] border-b-[3px] border-[#E7C47A] bg-[#F24F43]" />
      </div>

      <div className="flex-1 px-7 pt-[84px] pb-6 flex flex-col items-center">
        <img src={contact.avatar} className="w-11 h-11 rounded-md object-cover shadow-sm" />
        <div className="mt-4 text-[32px] text-[#191919] dark:text-white font-medium truncate max-w-full">{contact.name}的红包</div>

        <div className="mt-4 text-[40px] leading-none font-semibold tracking-[1px] text-[#C9A769] dark:text-[#D7B97B]">
          {displayAmount}
          <span className="ml-1 text-[16px] font-medium">元</span>
        </div>
        <div className="mt-6 text-[15px] text-[#B69B66] dark:text-[#B59A63]">已存入零钱，可直接转账</div>

        {!showResultOnly && (
          <button
            className={`app-button mt-8 h-[54px] w-full max-w-[280px] text-[16px] font-medium ${isOpened ? 'app-button-muted opacity-80' : 'app-button-primary active:scale-[0.99]'}`}
            onClick={onConfirm}
          >
            {isOpened ? '已领取' : '确认领取'}
          </button>
        )}

        <div className="mt-14 w-full border-t border-[#E9E9E9] dark:border-[#2B2B2B] pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <img src={receiverAvatar} className="w-12 h-12 rounded-md object-cover" />
              <div className="ml-3 min-w-0">
                <div className="text-[16px] text-[#181818] dark:text-white truncate">{receiverName}</div>
                <div className="mt-1 text-[13px] text-[#B3B3B3]">{safeReceivedTime}</div>
              </div>
            </div>
            <div className="ml-4 text-[18px] leading-none font-medium text-[#111] dark:text-white">{displayAmount}<span className="text-[14px]"> 元</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 我的钱包
export const WalletView: React.FC<{ balance: number; onBack: () => void; onTopUp: () => void; onWithdraw: () => void }> = ({ balance, onBack, onTopUp, onWithdraw }) => (
  <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
    <MobileHeader title="零钱明细" onBack={onBack} className="render-bg-primary border-none" />
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="flex flex-col items-center pt-20">
        <div className="w-16 h-16 rounded-full bg-[#FFC83D] flex items-center justify-center text-white text-4xl shadow-sm">
          ¥
        </div>
        <div className="mt-6 text-[16px] text-gray-500">我的零钱</div>
        <div className="mt-3 text-5xl font-semibold text-gray-900 dark:text-white">¥{Number(balance).toFixed(2)}</div>
      </div>

      <div className="mt-auto flex flex-col items-center pb-14">
        <button className="app-button app-button-primary w-full max-w-[260px] whitespace-nowrap" onClick={onTopUp}>充值</button>
        <button className="app-button app-button-muted w-full max-w-[260px] mt-4 whitespace-nowrap" onClick={onWithdraw}>提现</button>
        <div className="mt-10 text-center text-[13px] text-gray-400">
          常见问题｜账户升级服务
        </div>
        <div className="mt-2 text-center text-[12px] text-gray-300">
          本服务由叙说银行提供
        </div>
      </div>
    </div>
  </div>
);

// 银行卡充值
export const WalletTopUpView: React.FC<{ bankName: string; bankLast4: string; onEditBank: () => void; onBack: () => void; onConfirm: (amount: string) => void }> = ({ bankName, bankLast4, onEditBank, onBack, onConfirm }) => {
  const [amount, setAmount] = useState('');
  const canTopUp = parseWalletAmount(amount) !== null;

  return (
    <div className="fixed inset-0 z-[300] render-bg-primary flex flex-col animate-in slide-in-from-bottom duration-300 overflow-x-hidden">
      <MobileHeader
        title="充值"
        onBack={onBack}
        className="render-bg-primary border-none"
        backIcon={<i className="wechat-header-btn fa-solid fa-xmark text-xl"></i>}
      />
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
        <button className="px-5 pt-2 pb-4 text-[13px] text-gray-500 flex items-center justify-between" onClick={onEditBank}>
          <span>充值方式</span>
          <div className="flex items-center space-x-2 text-gray-700">
            <span>{bankName}（{bankLast4}）</span>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </div>
        </button>

        <div className="px-4">
          <div className="render-bg-secondary rounded-2xl border render-border-subtle shadow-sm">
            <div className="px-5 pt-5 pb-4">
              <div className="text-sm text-gray-500 mb-3">充值金额</div>
              <div className="flex items-center">
                <span className="text-4xl font-semibold mr-2 dark:text-white">¥</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="flex-1 text-4xl bg-transparent outline-none dark:text-white font-semibold"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder=""
                />
              </div>
            </div>
            <div className="border-t render-border-subtle px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#FFF3D6] flex items-center justify-center text-[#FFC83D] text-xl">
                  <i className="fa-solid fa-gem"></i>
                </div>
                <div>
                  <div className="text-[14px] text-gray-700 dark:text-gray-200">可充值到零钱通后消费</div>
                  <div className="text-[12px] text-gray-400">有收益，可免费提现回银行卡</div>
                </div>
              </div>
              <i className="fa-solid fa-chevron-right text-[12px] text-gray-300"></i>
            </div>
          </div>
        </div>

        <div className="mt-auto flex justify-end px-6 pb-10">
          <button
            className={`app-button text-base font-medium ${canTopUp ? 'app-button-primary' : 'app-button-muted opacity-60 cursor-not-allowed'}`}
            disabled={!canTopUp}
            onClick={() => onConfirm(amount)}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

// 提现
export const WalletWithdrawView: React.FC<{ balance: number; bankName: string; bankLast4: string; onEditBank: () => void; onBack: () => void; onConfirm: (amount: string) => void }> = ({ balance, bankName, bankLast4, onEditBank, onBack, onConfirm }) => {
  const [amount, setAmount] = useState('');
  const available = Number.isFinite(balance) ? balance : 0;
  const parsedAmount = parseWalletAmount(amount);
  const canWithdraw = parsedAmount !== null && parsedAmount <= available;

  return (
    <div className="fixed inset-0 z-[300] render-bg-primary flex flex-col animate-in slide-in-from-bottom duration-300 overflow-x-hidden">
      <MobileHeader
        title="提现"
        onBack={onBack}
        className="render-bg-primary border-none"
        backIcon={<i className="wechat-header-btn fa-solid fa-xmark text-xl"></i>}
      />
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
        <button className="px-5 pt-2 pb-4 text-[13px] text-gray-500 flex items-center justify-between" onClick={onEditBank}>
          <span>到账银行卡</span>
          <div className="flex items-center space-x-2 text-gray-700">
            <span>{bankName}（{bankLast4}）</span>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </div>
        </button>

        <div className="px-4">
          <div className="render-bg-secondary rounded-2xl border render-border-subtle shadow-sm">
            <div className="px-5 pt-5 pb-4">
              <div className="text-sm text-gray-500 mb-3">提现金额</div>
              <div className="flex items-center">
                <span className="text-4xl font-semibold mr-2 dark:text-white">¥</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="flex-1 text-4xl bg-transparent outline-none dark:text-white font-semibold"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder=""
                />
              </div>
              <div className="text-[12px] text-gray-400 mt-3">可提现余额 ¥{available.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="mt-auto flex justify-end px-6 pb-10">
          <button
            className={`app-button text-base font-medium ${canWithdraw ? 'app-button-primary' : 'app-button-muted opacity-60 cursor-not-allowed'}`}
            disabled={!canWithdraw}
            onClick={() => onConfirm(amount)}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};
