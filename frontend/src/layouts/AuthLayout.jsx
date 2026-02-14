import { motion } from 'framer-motion';
import { Outlet } from 'react-router-dom';

import logoImg from '../../assets/logo.png';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <motion.div
        className="hidden lg:flex lg:w-[48%] bg-examia-dark flex-col justify-between p-12 xl:p-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center">
          <img src={logoImg} alt="Examia" className="h-10 w-auto" />
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl xl:text-4xl font-bold text-white tracking-tight leading-tight mb-5">
            IB E-Learning Platform
          </h1>
          <p className="text-examia-soft text-base xl:text-lg leading-relaxed">
            Flash cards, quizzes, TOK, and assessments powered by AI — built for IB schools.
          </p>
        </div>
        <p className="text-examia-soft/70 text-sm">© Examia. For schools using the IB system.</p>
      </motion.div>
      <motion.div
        className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-examia-bg"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
      >
        <div className="w-full max-w-[400px]">
          <Outlet />
        </div>
      </motion.div>
    </div>
  );
}
