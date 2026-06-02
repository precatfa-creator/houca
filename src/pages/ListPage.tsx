import { useAuction } from '../hooks/useAuction';
import { motion, AnimatePresence } from 'motion/react';

export default function ListPage() {
  const { auctionState } = useAuction();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] w-full relative">
      <AnimatePresence mode="wait">
        {!auctionState ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center p-16 py-24 backdrop-blur-md bg-white/70 rounded-[3rem] border border-white/50 shadow-2xl"
          >
            <h1 className="text-6xl font-serif text-gray-900 font-bold mb-6 tracking-tight leading-normal py-2">المزاد العلني</h1>
            <p className="text-2xl text-gray-600 font-medium">في انتظار دخول أول المستويات للمزاد...</p>
          </motion.div>
        ) : auctionState.isSold ? (
            <motion.div
            key="sold"
            initial={{ opacity: 0, scale: 0.5, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
             exit={{ opacity: 0, scale: 1.5, rotate: 5 }}
             transition={{ type: "spring", stiffness: 100 }}
            className="text-center p-20 backdrop-blur-md bg-green-600/90 rounded-[4rem] shadow-2xl relative overflow-hidden flex flex-col items-center border-[8px] border-green-400"
          >
            <div className="absolute inset-0 bg-white/10 opacity-50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/30 to-transparent"></div>
            <motion.div 
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ delay: 0.3, type: "spring", bounce: 0.6 }}
               className="bg-white text-green-600 rounded-full p-6 mb-8 shadow-xl"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </motion.div>
            <h1 className="text-7xl font-serif text-white font-bold mb-6 drop-shadow-lg relative z-10">تم البيع!</h1>
            <p className="text-4xl text-green-100 font-bold relative z-10">{auctionState.horseName}</p>
             {auctionState.currentPrice !== null && (
                 <p className="text-5xl text-white font-bold mt-6 relative z-10 drop-shadow-xl flex items-center justify-center gap-3">
                     <span>{auctionState.currentPrice.toLocaleString()}</span>
                     <span>د.ل</span>
                 </p>
             )}
          </motion.div>
        ) : (
          <div key="auction" className="flex flex-col items-center w-full max-w-5xl">
            <motion.div 
              initial={{ opacity: 0, y: -40 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 md:mb-12 py-8 px-12 md:px-20 backdrop-blur-md bg-white/80 rounded-[3rem] border border-white/50 shadow-2xl relative overflow-hidden text-center"
            >
               <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-transparent tracking-tight leading-normal py-4">
                {auctionState.horseName}
              </h1>
            </motion.div>

            <div className="relative w-full flex justify-center items-center h-[20rem] md:h-[28rem] overflow-hidden mt-4">
              <AnimatePresence mode="popLayout">
                {auctionState.currentPrice === null ? (
                     <motion.div
                     key="waiting-bid"
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     className="absolute text-center flex flex-col items-center"
                   >
                       <div className="w-16 h-16 border-t-4 border-b-4 border-amber-500 rounded-full animate-spin mb-8 shadow-xl"></div>
                       <p className="text-4xl text-gray-800 font-bold backdrop-blur-md bg-white/40 px-10 py-6 rounded-3xl shadow-sm tracking-wider">
                           في انتظار افتتاح المزاد...
                       </p>
                   </motion.div>
                ) : (
                    <motion.div
                    key={auctionState.timestamp}
                    initial={{ opacity: 0, y: 300, scale: 0.7 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -300, scale: 1.3 }}
                    transition={{ 
                        type: "spring", 
                        stiffness: 90, 
                        damping: 20,
                        opacity: { duration: 0.3 }
                    }}
                    className="absolute"
                    >
                    <div className="flex items-center justify-center text-amber-500 drop-shadow-2xl font-bold bg-white/95 px-10 py-8 md:px-16 md:py-12 rounded-[2rem] md:rounded-[4rem] border-[4px] md:border-[6px] border-amber-300 shadow-xl relative overflow-hidden min-w-[300px] md:min-w-[600px]">
                        <div className="absolute top-0 start-0 w-full h-full bg-gradient-to-b from-white/40 to-transparent"></div>
                        <span className="text-8xl md:text-[10rem] lg:text-[13rem] leading-none tracking-tighter text-gray-900 relative z-10" style={{ textShadow: '0 10px 30px rgba(251, 191, 36, 0.4)' }}>
                        {auctionState.currentPrice.toLocaleString()}
                        </span>
                        <span className="text-6xl md:text-[5rem] lg:text-[7rem] ms-3 md:ms-4 relative z-10">د.ل</span>
                    </div>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-12 md:mt-20 text-center text-gray-800 font-bold text-2xl md:text-3xl tracking-[0.3em] md:tracking-[0.5em] flex items-center justify-center gap-4 md:gap-6 backdrop-blur-md bg-white/60 py-4 px-8 md:px-12 rounded-full shadow-sm border border-white/50"
            >
              <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping"></div>
               {auctionState.currentPrice === null ? 'للعــــــــرض' : 'المزايدة قائمة'}
              <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping delay-300"></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
