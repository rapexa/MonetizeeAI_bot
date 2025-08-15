import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MessageSquare, 
  Copy, 
  Search, 
  Filter,
  BookOpen,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  ShoppingCart,
  Heart,
  Star,
  Zap,
  ArrowRight,
  ArrowLeft,
  X
} from 'lucide-react';

interface Prompt {
  id: string;
  title: string;
  desc: string;
  text: string;
  level?: number;
}

interface PromptCategory {
  title: string;
  icon: string;
  color: string;
  prompts: Prompt[];
}

const ReadyPrompts: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('levels');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [showLevelSelector, setShowLevelSelector] = useState(false);

  // Handle URL parameters for stage selection
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const stageParam = searchParams.get('stage');
    if (stageParam) {
      const stageNumber = parseInt(stageParam);
      if (stageNumber >= 1 && stageNumber <= 29) {
        setSelectedLevel(stageNumber);
        setSelectedCategory('levels');
      }
    }
  }, [location.search]);

  const promptCategories: Record<string, PromptCategory> = {
    business: {
      title: 'کسب‌وکار',
      icon: '💼',
      color: 'from-blue-500 to-indigo-600',
      prompts: [
        { id: 'business-idea', title: 'ایده کسب‌وکار', desc: 'ایده نوآورانه برای شروع کسب‌وکار', text: 'لطفاً یک ایده کسب‌وکار نوآورانه برای حوزه [نوع کسب‌وکار] که با سرمایه [مقدار سرمایه] قابل شروع باشد پیشنهاد بده.' },
        { id: 'business-model', title: 'مدل کسب‌وکار', desc: 'طراحی مدل درآمدی پایدار', text: 'یک مدل کسب‌وکار کامل برای [نوع کسب‌وکار] طراحی کن که شامل منابع درآمد، ساختار هزینه و پیشنهاد ارزش باشد.' },
        { id: 'competition-analysis', title: 'تحلیل رقابت', desc: 'بررسی عمیق رقبای بازار', text: 'تحلیل کاملی از رقبای موجود در بازار [نام بازار] ارائه بده و نقاط قوت و ضعف آنها را مشخص کن.' },
        { id: 'swot-analysis', title: 'تحلیل SWOT', desc: 'تحلیل استراتژیک کسب‌وکار', text: 'تحلیل SWOT کاملی برای کسب‌وکار [نوع کسب‌وکار] در بازار [نام بازار] انجام بده.' },
        { id: 'business-plan', title: 'طرح کسب‌وکار', desc: 'برنامه جامع و عملیاتی', text: 'یک طرح کسب‌وکار کامل برای [نوع کسب‌وکار] تهیه کن که شامل بازاریابی، مالی، عملیات و استراتژی باشد.' },
        { id: 'scalability-plan', title: 'طرح مقیاس‌پذیری', desc: 'استراتژی رشد و توسعه', text: 'طرح مقیاس‌پذیری برای کسب‌وکار [نوع کسب‌وکار] ارائه بده که شامل مراحل رشد، منابع و چالش‌ها باشد.' },
        { id: 'risk-management', title: 'مدیریت ریسک', desc: 'شناسایی و کنترل ریسک‌ها', text: 'طرح مدیریت ریسک برای کسب‌وکار [نوع کسب‌وکار] تهیه کن که شامل شناسایی، ارزیابی و کاهش ریسک‌ها باشد.' }
      ]
    },
    levels: {
      title: 'مراحل آموزشی',
      icon: '🎯',
      color: 'from-purple-500 to-pink-600',
      prompts: [
        { id: 'level-1', title: 'مرحله ۱: اهمیت انتخاب ایده', desc: 'چرا انتخاب ایده مهم‌ترین قدمه', level: 1, text: 'برای فردی که می‌خواهد یک کسب‌وکار مبتنی بر هوش مصنوعی راه‌اندازی کند و هیچ ایده‌ای ندارد، توضیح بده:\n1. پنج دلیل اصلی که چرا انتخاب ایده درست مهم‌ترین قدم در راه‌اندازی کسب‌وکار است.\n2. سه مثال واقعی از شکست کسب‌وکارها به دلیل انتخاب ایده نادرست، همراه با توضیح اینکه چگونه می‌شد از این شکست جلوگیری کرد.\n3. سه مزیت انتخاب ایده مناسب و اثر آن بر سرعت رسیدن به درآمد.\nلحن پاسخ باید آموزشی، انگیزشی و با مثال‌های ساده و قابل فهم باشد.' },
        { id: 'level-2', title: 'مرحله ۲: ویژگی‌های ایده پول‌ساز', desc: 'ویژگی‌های یک ایده پول‌ساز قابل اجرا با AI', level: 2, text: 'من می‌خواهم بدانم یک ایده پول‌ساز که بتوان با هوش مصنوعی آن را اجرا کرد چه ویژگی‌هایی باید داشته باشد.\n1. فهرست کامل ویژگی‌های کلیدی یک ایده پول‌ساز قابل اجرا با AI.\n2. پنج نمونه ایده عمومی در حوزه‌های مختلف که با AI قابلیت درآمدزایی دارند و توضیح دلیل پتانسیل هر کدام.\n3. یک چک‌لیست کامل و قابل استفاده برای ارزیابی هر ایده و تشخیص اینکه آیا پول‌ساز است یا نه.\nتوضیحات باید به زبان ساده و با مثال باشد تا برای افراد تازه‌کار هم قابل فهم باشد.' },
        { id: 'level-3', title: 'مرحله ۳: تولید ایده‌های شخصی‌سازی‌شده', desc: 'تولید ایده‌های شخصی‌سازی‌شده با GPT', level: 3, text: 'با توجه به اطلاعات زیر، برای من ایده‌های شخصی‌سازی‌شده پیشنهاد بده:\n- مهارت‌ها: [مهارت‌ها]\n- علاقه‌مندی‌ها: [علایق]\n- تجربه‌ها: [تجربه‌ها]\n- حوزه یا صنعتی که به آن علاقه دارم (اختیاری): [حوزه فعالیت]\nخروجی مورد نیاز:\n1. حداقل 10 ایده پول‌ساز قابل اجرا با AI که متناسب با شرایط من باشد.\n2. برای هر ایده، توضیح بده چه مشکل واقعی را حل می‌کند.\n3. از بین ایده‌ها، سه ایده‌ای که بیشترین پتانسیل موفقیت و بیشترین هیجان برای من ایجاد می‌کنند را انتخاب کن و دلایل انتخاب را توضیح بده.\n4. برای هر یک از سه ایده برتر، اولین قدم عملی برای شروع را پیشنهاد بده.' },
        { id: 'level-4', title: 'مرحله ۴: مقایسه و انتخاب ایده نهایی', desc: 'مقایسه و انتخاب ایده نهایی', level: 4, text: 'من چند ایده دارم و می‌خواهم بهترین آن‌ها را انتخاب کنم.\nایده‌ها:\n- [ایده ۱]\n- [ایده ۲]\n- [ایده ۳]\n1. یک جدول مقایسه برای این ایده‌ها تهیه کن و آن‌ها را بر اساس معیارهای علاقه شخصی، میزان تقاضا، سطح مهارت لازم، پتانسیل درآمد، و ریسک امتیاز بده.\n2. بر اساس نتایج، بهترین ایده را انتخاب کن و دلیل انتخابت را توضیح بده.\n3. ریسک‌ها و چالش‌های احتمالی اجرای ایده برتر را لیست کن.\n4. پیشنهاد بده اولین اقدام عملی برای اجرای این ایده چه باشد.' },
        { id: 'level-5', title: 'مرحله ۵: پیش‌نمایش سرویس و مسیر سریع', desc: 'پیش‌نمایش سرویس و طراحی مسیر سریع تا اولین درآمد', level: 5, text: 'ایده انتخاب‌شده من این است: [ایده]\nلطفاً:\n1. یک پیش‌نمایش ساده و قابل فهم از این سرویس برای مشتریان عمومی بنویس.\n2. یک مسیر گام‌به‌گام طراحی کن که بتوانم در کوتاه‌ترین زمان ممکن از این ایده به اولین درآمد برسم.\n3. سه روش سریع و کم‌هزینه برای پیدا کردن اولین مشتری پیشنهاد بده.\n4. یک متن کوتاه برای معرفی این سرویس به دوستان یا آشنایان جهت تست اولیه بنویس.' },
        { id: 'level-6', title: 'مرحله ۶: طراحی سرویس واقعی', desc: 'طراحی سرویس واقعی با AI (شامل اسم، شعار و موقعیت برند)', level: 6, text: 'من می‌خواهم سرویس واقعی خود را طراحی کنم.\nاطلاعات:\n- ایده اصلی: [ایده]\n- ویژگی شاخص سرویس: [ویژگی اصلی]\nلطفاً:\n1. 10 اسم برند خلاقانه و کوتاه پیشنهاد بده.\n2. برای هر اسم، یک شعار تبلیغاتی کوتاه و جذاب بنویس.\n3. موقعیت برند را به‌گونه‌ای تعریف کن که از رقبا متمایز شود و اعتماد مشتری را جلب کند.\n4. یک توضیح کوتاه برای معرفی سرویس در شبکه‌های اجتماعی پیشنهاد بده.' },
        { id: 'level-7', title: 'مرحله ۷: ساخت MVP و تست', desc: 'ساخت نسخه اولیه (MVP) و تست با بازار کوچک', level: 7, text: 'من می‌خواهم یک نسخه اولیه از سرویس خودم بسازم.\nاطلاعات:\n- ایده: [ایده]\nلطفاً:\n1. یک نسخه اولیه ساده طراحی کن که با کمترین منابع ممکن قابل اجرا باشد.\n2. یک چک‌لیست کامل برای تست MVP در یک گروه کوچک پیشنهاد بده.\n3. پنج روش کم‌هزینه و سریع برای گرفتن بازخورد واقعی از مشتریان بالقوه پیشنهاد بده.\n4. یک فرم نمونه برای جمع‌آوری بازخورد مشتریان طراحی کن.' },
        { id: 'level-8', title: 'مرحله ۸: معرفی حرفه‌ای و پیشنهاد پولی', desc: 'معرفی حرفه‌ای سرویس + طراحی پیشنهاد پولی اولیه', level: 8, text: 'ایده سرویس من: [ایده]\nلطفاً:\n1. یک متن معرفی کوتاه و متقاعدکننده بنویس که مشتریان عمومی را به خرید ترغیب کند.\n2. یک پیشنهاد پولی اولیه طراحی کن که مشتری نتواند رد کند.\n3. سه تکنیک برای ارائه این پیشنهاد به مشتری پیشنهاد بده که احتمال خرید را بالا ببرد.\n4. یک نمونه پیام کوتاه (پیامک یا واتساپ) برای معرفی این پیشنهاد بنویس.' },
        { id: 'level-9', title: 'مرحله ۹: طراحی داستان برند', desc: 'طراحی داستان برند و پیام احساسی برای فروش', level: 9, text: 'برند من تازه راه‌اندازی شده است.\nاطلاعات:\n- نام برند: [نام برند]\n- حوزه فعالیت: [حوزه فعالیت]\nلطفاً:\n1. یک داستان برند کوتاه و احساسی بنویس که اعتماد مشتریان را جلب کند.\n2. پیام اصلی برند را در یک جمله ماندگار و احساسی خلاصه کن.\n3. سه ایده خلاقانه برای گفتن داستان برند در شبکه‌های اجتماعی پیشنهاد بده.\n4. یک نمونه متن برای استفاده در صفحه «درباره ما» سایت یا شبکه اجتماعی بنویس.' },
        { id: 'level-10', title: 'مرحله ۱۰: طراحی حداقل نسخه برند', desc: 'طراحی حداقل نسخه برند (رنگ، فونت، شخصیت) با AI', level: 10, text: 'برند من:\n- نام برند: [نام برند]\n- حوزه فعالیت: [حوزه فعالیت]\nلطفاً:\n1. سه پالت رنگی پیشنهاد بده که با شخصیت برند من هماهنگ باشد.\n2. یک پیشنهاد فونت مناسب برای برند بده که با هویت آن سازگار باشد.\n3. شخصیت برند را تعریف کن و بگو چگونه باید در محتوا و ارتباط با مشتری نشان داده شود.\n4. یک نمونه استایل بصری ساده برای استفاده در شبکه‌های اجتماعی پیشنهاد بده.' },
        { id: 'level-11', title: 'مرحله ۱۱: طراحی لوگو و گرافیک', desc: 'طراحی لوگو و گرافیک سریع برای شروع فروش', level: 11, text: 'برند من:\n- نام برند: [نام برند]\n- حوزه فعالیت: [حوزه فعالیت]\nلطفاً:\n1. سه ایده برای طراحی لوگو که ساده، به‌یادماندنی و مرتبط با هویت برند باشد پیشنهاد بده.\n2. یک توضیح کوتاه از هر ایده بده که چرا برای برند مناسب است.\n3. سه نمونه گرافیک یا المان بصری که می‌تواند در استوری و پست‌های شبکه‌های اجتماعی استفاده شود پیشنهاد بده.\n4. یک پیشنهاد برای استفاده از این گرافیک‌ها در معرفی اولیه سرویس ارائه بده.' },
        { id: 'level-12', title: 'مرحله ۱۲: راه‌اندازی صفحه فرود', desc: 'راه‌اندازی صفحه فرود حرفه‌ای برای جذب چندکاناله', level: 12, text: 'من می‌خواهم یک صفحه فرود طراحی کنم.\nاطلاعات:\n- هدف صفحه فرود: [هدف]\n- محصول یا سرویس: [ایده/سرویس]\nلطفاً:\n1. ساختار کامل یک صفحه فرود حرفه‌ای که باعث جذب مشتری شود طراحی کن.\n2. بخش‌های اصلی صفحه (تیتر، مزایا، اثبات اجتماعی، کال‌تو‌اکشن و…) را با مثال پیشنهاد بده.\n3. سه ایده برای هدایت بازدیدکننده به ثبت‌نام یا خرید ارائه بده.\n4. یک متن نمونه برای بخش بالای صفحه فرود بنویس.' },
        { id: 'level-13', title: 'مرحله ۱۳: اتصال سیستم پرداخت', desc: 'اتصال سیستم پرداخت و درگاه امن', level: 13, text: 'من می‌خواهم سیستم پرداخت آنلاین را برای سرویس خودم راه‌اندازی کنم.\nاطلاعات:\n- نوع سرویس یا محصول: [ایده/سرویس]\nلطفاً:\n1. مراحل راه‌اندازی یک سیستم پرداخت امن را توضیح بده.\n2. سه گزینه مناسب برای پرداخت آنلاین در [کشور/منطقه] پیشنهاد بده.\n3. نکات امنیتی برای جلوگیری از مشکلات مالی یا هک را بنویس.\n4. یک چک‌لیست کوتاه برای بررسی قبل از فعال‌سازی درگاه پرداخت بده.' },
        { id: 'level-14', title: 'مرحله ۱۴: آماده‌سازی کانال‌های پشتیبانی', desc: 'آماده‌سازی کانال‌های پشتیبانی و اولین کانال جذب مکمل', level: 14, text: 'من می‌خواهم یک سیستم پشتیبانی مشتری و یک کانال جذب مکمل داشته باشم.\nلطفاً:\n1. بهترین روش برای انتخاب کانال پشتیبانی (واتساپ، ایمیل، تیکت، تلگرام و…) را توضیح بده.\n2. سه ابزار رایگان یا کم‌هزینه برای مدیریت پشتیبانی معرفی کن.\n3. یک کانال جذب مکمل غیر از اینستاگرام پیشنهاد بده که برای سرویس من مناسب باشد.\n4. یک متن خوشامدگویی برای اولین پیام پشتیبانی به مشتری بنویس.' },
        { id: 'level-15', title: 'مرحله ۱۵: ساخت پیج حرفه‌ای اینستاگرام', desc: 'ساخت پیج حرفه‌ای اینستاگرامی برای جذب فالوئر هدفمند', level: 15, text: 'من می‌خواهم یک پیج اینستاگرامی حرفه‌ای بسازم.\nاطلاعات:\n- حوزه فعالیت: [حوزه فعالیت]\nلطفاً:\n1. سه ایده برای نام کاربری پیج که ساده و به‌یادماندنی باشد بده.\n2. ساختار هایلایت‌ها و دسته‌بندی محتوا را پیشنهاد بده.\n3. سه روش برای جذب فالوئر هدفمند و واقعی در حوزه [حوزه فعالیت] ارائه بده.\n4. یک متن بیوی کوتاه و جذاب برای پیج بنویس.' },
        { id: 'level-16', title: 'مرحله ۱۶: طراحی بایو و هایلایت', desc: 'طراحی بایو، هایلایت و پروفایل فروشنده‌ساز با AI', level: 16, text: 'پیج اینستاگرامی من:\n- حوزه فعالیت: [حوزه فعالیت]\n- نام برند: [نام برند]\nلطفاً:\n1. یک بیو اینستاگرام سه‌خطی بنویس که شامل معرفی، مزیت و کال‌تو‌اکشن باشد.\n2. ایده‌های طراحی کاور هایلایت‌ها را پیشنهاد بده.\n3. سه عکس پروفایل ایده‌آل برای برند من توصیف کن.\n4. یک نمونه متن پین‌شده برای اولین پست معرفی پیج ارائه بده.' },
        { id: 'level-17', title: 'مرحله ۱۷: تولید محتوا و استوری', desc: 'تولید محتوا و استوری اعتمادساز + انتشار در کانال مکمل', level: 17, text: 'من می‌خواهم محتوای اعتمادساز تولید کنم.\nاطلاعات:\n- حوزه فعالیت: [حوزه فعالیت]\nلطفاً:\n1. سه ایده پست آموزشی و سه ایده پست اعتمادساز برای حوزه [حوزه فعالیت] پیشنهاد بده.\n2. سه ایده استوری برای نمایش رضایت مشتری یا پشت‌صحنه کار بده.\n3. یک نمونه متن کپشن برای یک پست آموزشی بنویس.\n4. پیشنهاد بده این محتوا را در کدام کانال مکمل منتشر کنم.' },
        { id: 'level-18', title: 'مرحله ۱۸: پیدا کردن اولین مشتری', desc: 'پیدا کردن اولین مشتری با روش‌های سریع و کم‌هزینه', level: 18, text: 'من می‌خواهم اولین مشتری خودم را جذب کنم.\nاطلاعات:\n- حوزه فعالیت: [حوزه فعالیت]\n- ایده/سرویس: [ایده]\nلطفاً:\n1. پنج روش سریع و کم‌هزینه برای پیدا کردن اولین مشتری پیشنهاد بده.\n2. یک متن کوتاه برای معرفی سرویس به مشتری بالقوه بنویس.\n3. سه روش برای پیگیری مشتریان بالقوه که پاسخ نداده‌اند پیشنهاد بده.\n4. یک ایده برای برگزاری یک پیشنهاد محدود زمانی بده.' },
        { id: 'level-19', title: 'مرحله ۱۹: طراحی پیشنهاد فروش', desc: 'طراحی پیشنهاد فروش و اجرای روان‌شناسی خرید', level: 19, text: 'من می‌خواهم یک پیشنهاد فروش جذاب داشته باشم.\nاطلاعات:\n- محصول یا سرویس: [ایده/سرویس]\nلطفاً:\n1. پنج عنصر کلیدی یک پیشنهاد فروش موفق را توضیح بده.\n2. یک پیشنهاد فروش کامل برای سرویس [ایده] بنویس.\n3. سه تکنیک روان‌شناسی خرید برای افزایش نرخ تبدیل پیشنهاد بده.\n4. یک متن کوتاه برای معرفی این پیشنهاد در شبکه‌های اجتماعی بنویس.' },
        { id: 'level-20', title: 'مرحله ۲۰: مکالمه فروش', desc: 'مکالمه فروش و تبدیل لید به خریدار', level: 20, text: 'من می‌خواهم یک مکالمه فروش مؤثر داشته باشم.\nاطلاعات:\n- محصول یا سرویس: [ایده/سرویس]\nلطفاً:\n1. یک اسکریپت کامل مکالمه فروش برای صحبت با مشتری بالقوه بنویس.\n2. سه سؤال کلیدی برای شناسایی نیاز مشتری پیشنهاد بده.\n3. سه روش برای غلبه بر اعتراضات مشتری ارائه بده.\n4. یک پیام کوتاه برای پیگیری بعد از مکالمه بنویس.' },
        { id: 'level-21', title: 'مرحله ۲۱: ساخت سیستم CRM', desc: 'ساخت سیستم CRM و مدیریت مشتریان', level: 21, text: 'من می‌خواهم یک سیستم مدیریت ارتباط با مشتری (CRM) برای کسب‌وکارم راه‌اندازی کنم.\nاطلاعات:\n- نوع سرویس یا محصول: [ایده/سرویس]\nلطفاً:\n1. بهترین روش برای دسته‌بندی مشتریانم را توضیح بده.\n2. سه ابزار CRM رایگان یا کم‌هزینه معرفی کن که برای کسب‌وکارهای کوچک مناسب باشند.\n3. یک فرآیند ساده برای ثبت، پیگیری و مدیریت مشتریان پیشنهاد بده.\n4. یک نمونه جدول مدیریت مشتریان با ستون‌های کلیدی ارائه بده.' },
        { id: 'level-22', title: 'مرحله ۲۲: اجرای فالوآپ خودکار', desc: 'اجرای فالوآپ خودکار با ایمیل، واتساپ یا SMS', level: 22, text: 'من می‌خواهم فرآیند پیگیری مشتریان را خودکار کنم.\nاطلاعات:\n- نوع سرویس یا محصول: [ایده/سرویس]\nلطفاً:\n1. سه روش برای خودکارسازی ارسال پیام به مشتریان بالقوه پیشنهاد بده.\n2. یک نمونه سناریوی پیام‌های فالوآپ در سه مرحله بنویس (پیام اول، یادآوری، پیشنهاد ویژه).\n3. بهترین زمان‌بندی برای ارسال این پیام‌ها را توضیح بده.\n4. یک پیام نمونه برای هر کانال (ایمیل، واتساپ، SMS) ارائه بده.' },
        { id: 'level-23', title: 'مرحله ۲۳: طراحی سناریوهای اتوماسیون', desc: 'طراحی سناریوهای اتوماسیون فروش و خدمات', level: 23, text: 'من می‌خواهم فرآیندهای فروش و خدمات پس از فروش را اتوماسیون کنم.\nاطلاعات:\n- نوع سرویس یا محصول: [ایده/سرویس]\nلطفاً:\n1. سه فرآیند قابل اتوماسیون در فروش یا پشتیبانی پیشنهاد بده.\n2. یک نمونه سناریو کامل اتوماسیون از جذب لید تا فروش نهایی بنویس.\n3. ابزارها و نرم‌افزارهای مناسب برای اجرای این اتوماسیون را معرفی کن.\n4. یک فلوچارت ساده از این فرآیند ارائه بده.' },
        { id: 'level-24', title: 'مرحله ۲۴: انتخاب بازار بین‌المللی', desc: 'انتخاب بازار بین‌المللی مناسب', level: 24, text: 'من می‌خواهم بازار بین‌المللی هدفم را انتخاب کنم.\nاطلاعات:\n- حوزه فعالیت: [حوزه فعالیت]\nلطفاً:\n1. پنج معیار برای انتخاب یک بازار بین‌المللی مناسب پیشنهاد بده.\n2. سه کشور یا منطقه مناسب برای فعالیت در حوزه [حوزه فعالیت] معرفی کن.\n3. یک جدول مقایسه بین این بازارها بر اساس فرصت‌ها، چالش‌ها و پتانسیل درآمد ارائه بده.\n4. اولین قدم عملی برای ورود به این بازارها را پیشنهاد بده.' },
        { id: 'level-25', title: 'مرحله ۲۵: طراحی زیرساخت تیمی', desc: 'طراحی زیرساخت تیمی و فنی برای رشد ۱۰ برابری', level: 25, text: 'من می‌خواهم زیرساخت کسب‌وکارم را برای رشد سریع آماده کنم.\nاطلاعات:\n- نوع سرویس یا محصول: [ایده/سرویس]\nلطفاً:\n1. پنج عنصر کلیدی یک زیرساخت فنی پایدار را توضیح بده.\n2. ساختار پیشنهادی تیم برای پشتیبانی از رشد ۱۰ برابری را ارائه بده.\n3. ابزارها و نرم‌افزارهای لازم برای مدیریت تیم و پروژه معرفی کن.\n4. یک نقشه کلی از زیرساخت پیشنهادی ارائه بده.' },
        { id: 'level-26', title: 'مرحله ۲۶: طراحی نقشه رشد ۹۰ روزه', desc: 'طراحی نقشه رشد ۹۰ روزه با شاخص پیشرفت', level: 26, text: 'من می‌خواهم یک برنامه ۹۰ روزه برای رشد کسب‌وکارم داشته باشم.\nاطلاعات:\n- هدف اصلی: [هدف]\nلطفاً:\n1. یک برنامه سه‌ماهه با اهداف هفتگی و ماهانه پیشنهاد بده.\n2. شاخص‌های کلیدی عملکرد (KPI) برای سنجش پیشرفت معرفی کن.\n3. سه اقدام اصلی هر هفته را توضیح بده.\n4. یک قالب ساده برای پیگیری و ثبت پیشرفت ارائه بده.' },
        { id: 'level-27', title: 'مرحله ۲۷: سیستم تثبیت فروش', desc: 'سیستم تثبیت فروش و تکرارپذیری درآمد', level: 27, text: 'من می‌خواهم درآمدم را پایدار و تکرارپذیر کنم.\nاطلاعات:\n- نوع سرویس یا محصول: [ایده/سرویس]\nلطفاً:\n1. سه استراتژی برای ایجاد درآمد تکرارپذیر پیشنهاد بده.\n2. یک مدل فروش اشتراکی یا بسته خدماتی برای سرویس [ایده] طراحی کن.\n3. روش‌های حفظ مشتری و جلوگیری از ریزش آن‌ها را توضیح بده.\n4. یک برنامه پیگیری مشتریان برای تمدید یا خرید مجدد ارائه بده.' },
        { id: 'level-28', title: 'مرحله ۲۸: مدیریت طولانی‌مدت مشتریان', desc: 'مدیریت طولانی‌مدت مشتریان و ارتقاء آن‌ها', level: 28, text: 'من می‌خواهم ارزش طول عمر مشتریانم را افزایش دهم.\nاطلاعات:\n- نوع سرویس یا محصول: [ایده/سرویس]\nلطفاً:\n1. سه روش برای ارائه خدمات یا محصولات تکمیلی به مشتریان فعلی پیشنهاد بده.\n2. یک برنامه وفادارسازی مشتری طراحی کن.\n3. روش‌های شخصی‌سازی تجربه مشتری را توضیح بده.\n4. یک نمونه ایمیل یا پیام برای معرفی یک محصول یا سرویس جدید به مشتریان فعلی بنویس.' },
        { id: 'level-29', title: 'مرحله ۲۹: مسیر ادامه رشد و نوآوری', desc: 'مسیر ادامه رشد و نوآوری با AI', level: 29, text: 'من می‌خواهم بعد از تثبیت کسب‌وکار، آن را با استفاده از AI توسعه دهم.\nاطلاعات:\n- حوزه فعالیت: [حوزه فعالیت]\nلطفاً:\n1. پنج حوزه‌ای که AI می‌تواند در بهبود و نوآوری کسب‌وکارم کمک کند معرفی کن.\n2. سه ایده نوآورانه با استفاده از AI که بتواند درآمد جدید ایجاد کند پیشنهاد بده.\n3. یک برنامه کوتاه‌مدت و یک برنامه بلندمدت برای اجرای این نوآوری‌ها طراحی کن.\n4. منابع یا ابزارهای پیشنهادی برای یادگیری و پیاده‌سازی این نوآوری‌ها ارائه بده.' }
      ]
    },
    marketing: {
      title: 'بازاریابی',
      icon: '📈',
      color: 'from-green-500 to-emerald-600',
      prompts: [
        { id: 'marketing-strategy', title: 'استراتژی بازاریابی', desc: 'طرح بازاریابی جامع و کاربردی', text: 'یک استراتژی بازاریابی کامل برای محصول [نام محصول] در بازار [نوع بازار] با بودجه [مقدار بودجه] طراحی کن.' },
        { id: 'social-media', title: 'بازاریابی شبکه‌های اجتماعی', desc: 'استراتژی حضور دیجیتال', text: 'یک استراتژی بازاریابی در شبکه‌های اجتماعی برای [نوع کسب‌وکار] طراحی کن که شامل محتوا، زمان‌بندی و KPI باشد.' },
        { id: 'content-marketing', title: 'بازاریابی محتوا', desc: 'تولید محتوای تأثیرگذار', text: 'یک برنامه بازاریابی محتوا برای [نوع کسب‌وکار] تهیه کن که شامل انواع محتوا، کانال‌های توزیع و تقویم محتوا باشد.' },
        { id: 'email-marketing', title: 'ایمیل مارکتینگ', desc: 'کمپین‌های ایمیلی حرفه‌ای', text: 'یک کمپین ایمیل مارکتینگ برای [هدف کمپین] طراحی کن که شامل موضوع، محتوا و call-to-action باشد.' },
        { id: 'seo-strategy', title: 'استراتژی SEO', desc: 'بهینه‌سازی موتورهای جستجو', text: 'استراتژی SEO کاملی برای وبسایت [نوع وبسایت] ارائه بده که شامل کلمات کلیدی، محتوا و بک‌لینک باشد.' },
        { id: 'brand-strategy', title: 'استراتژی برندسازی', desc: 'ساخت هویت برند قدرتمند', text: 'استراتژی برندسازی کاملی برای [نام برند] طراحی کن که شامل هویت بصری، پیام‌رسانی و موقعیت‌یابی باشد.' },
        { id: 'influencer-marketing', title: 'بازاریابی تأثیرگذاران', desc: 'همکاری با اینفلوئنسرها', text: 'استراتژی بازاریابی تأثیرگذاران برای [نوع محصول] ارائه بده که شامل انتخاب، همکاری و اندازه‌گیری نتایج باشد.' },
        { id: 'customer-acquisition', title: 'جذب مشتری', desc: 'راهکارهای افزایش مشتری', text: 'طرح جذب مشتری برای [نوع کسب‌وکار] تهیه کن که شامل کانال‌ها، پیام‌ها و مراحل تبدیل باشد.' }
      ]
    },
    financial: {
      title: 'مالی',
      icon: '💰',
      color: 'from-yellow-500 to-orange-600',
      prompts: [
        { id: 'financial-plan', title: 'برنامه مالی', desc: 'طرح مدیریت مالی جامع', text: 'برنامه مالی ۱۲ ماهه برای کسب‌وکار [نوع کسب‌وکار] با درآمد هدف [مقدار درآمد] تهیه کن.' },
        { id: 'pricing-strategy', title: 'استراتژی قیمت‌گذاری', desc: 'تعیین قیمت بهینه و رقابتی', text: 'استراتژی قیمت‌گذاری برای محصول [نام محصول] در بازار [نوع بازار] با در نظر گیری رقبا و هزینه‌ها ارائه بده.' },
        { id: 'investment-plan', title: 'طرح سرمایه‌گذاری', desc: 'جذب سرمایه از سرمایه‌گذاران', text: 'طرح جذب سرمایه‌گذاری برای کسب‌وکار [نوع کسب‌وکار] با نیاز سرمایه [مقدار سرمایه] تهیه کن.' },
        { id: 'cash-flow', title: 'مدیریت جریان نقدی', desc: 'کنترل ورودی و خروجی پول', text: 'برنامه مدیریت جریان نقدی برای کسب‌وکار [نوع کسب‌وکار] ارائه بده که شامل پیش‌بینی درآمد و هزینه باشد.' },
        { id: 'roi-analysis', title: 'تحلیل بازگشت سرمایه', desc: 'محاسبه ROI و سودآوری پروژه', text: 'تحلیل بازگشت سرمایه (ROI) برای پروژه [نام پروژه] با سرمایه [مقدار سرمایه] انجام بده.' },
        { id: 'budget-planning', title: 'برنامه‌ریزی بودجه', desc: 'تخصیص بهینه منابع مالی', text: 'برنامه بودجه سالانه برای [نوع کسب‌وکار] تهیه کن که شامل درآمد، هزینه‌ها و اهداف مالی باشد.' },
        { id: 'cost-optimization', title: 'بهینه‌سازی هزینه', desc: 'کاهش هزینه‌ها و افزایش سود', text: 'طرح بهینه‌سازی هزینه‌ها برای [نوع کسب‌وکار] ارائه بده که شامل شناسایی، کاهش و کنترل هزینه‌ها باشد.' }
      ]
    },
    operations: {
      title: 'عملیات',
      icon: '⚙️',
              color: 'from-[#5a0ecc] to-pink-600',
      prompts: [
        { id: 'problem-solving', title: 'حل مشکل', desc: 'راهکار خلاقانه برای چالش‌ها', text: 'چالش [شرح چالش] در کسب‌وکارم رو دارم. بهترین راه‌حل‌ها رو پیشنهاد بده.' },
        { id: 'process-optimization', title: 'بهینه‌سازی فرآیند', desc: 'بهبود کارایی عملیات', text: 'فرآیند [نام فرآیند] در کسب‌وکارم رو بهینه‌سازی کن و راهکارهای بهبود ارائه بده.' },
        { id: 'team-management', title: 'مدیریت تیم', desc: 'رهبری موثر نیروی انسانی', text: 'استراتژی مدیریت تیم [تعداد نفر] نفره برای [نوع کسب‌وکار] ارائه بده که شامل انگیزش، ارتباط و توسعه باشد.' },
        { id: 'automation', title: 'اتوماسیون', desc: 'خودکارسازی هوشمند فرآیندها', text: 'راهکارهای اتوماسیون برای فرآیند [نام فرآیند] در کسب‌وکار [نوع کسب‌وکار] پیشنهاد بده.' },
        { id: 'quality-control', title: 'کنترل کیفیت', desc: 'تضمین کیفیت محصولات', text: 'سیستم کنترل کیفیت برای [نوع محصول/خدمات] طراحی کن که شامل معیارها، فرآیند و ابزارها باشد.' },
        { id: 'supply-chain', title: 'مدیریت زنجیره تأمین', desc: 'بهینه‌سازی تأمین و توزیع', text: 'استراتژی مدیریت زنجیره تأمین برای [نوع محصول] ارائه بده که شامل تأمین‌کنندگان، انبار و توزیع باشد.' },
        { id: 'performance-metrics', title: 'معیارهای عملکرد', desc: 'اندازه‌گیری و بهبود عملکرد', text: 'سیستم معیارهای عملکرد (KPI) برای [نوع کسب‌وکار] طراحی کن که شامل شاخص‌ها، اندازه‌گیری و گزارش‌دهی باشد.' }
      ]
    },
    technology: {
      title: 'فناوری',
      icon: '🚀',
      color: 'from-cyan-500 to-blue-600',
      prompts: [
        { id: 'digital-transformation', title: 'تحول دیجیتال', desc: 'نوسازی دیجیتال کسب‌وکار', text: 'طرح تحول دیجیتال برای کسب‌وکار [نوع کسب‌وکار] ارائه بده که شامل فناوری‌ها، مراحل و چالش‌ها باشد.' },
        { id: 'ai-integration', title: 'پیاده‌سازی هوش مصنوعی', desc: 'استفاده هوشمند از AI', text: 'راهکارهای پیاده‌سازی هوش مصنوعی در [نوع کسب‌وکار] برای بهبود [هدف مشخص] ارائه بده.' },
        { id: 'ecommerce-strategy', title: 'استراتژی تجارت الکترونیک', desc: 'فروش آنلاین حرفه‌ای', text: 'استراتژی تجارت الکترونیک برای [نوع محصول] که شامل پلتفرم، پرداخت و لجستیک باشد طراحی کن.' },
        { id: 'data-analytics', title: 'تحلیل داده', desc: 'تصمیم‌گیری مبتنی بر داده', text: 'سیستم تحلیل داده برای کسب‌وکار [نوع کسب‌وکار] طراحی کن که شامل KPI ها، ابزارها و گزارشات باشد.' },
        { id: 'cybersecurity', title: 'امنیت سایبری', desc: 'حفاظت جامع از اطلاعات', text: 'طرح امنیت سایبری برای کسب‌وکار [نوع کسب‌وکار] ارائه بده که شامل تهدیدات، راهکارها و پروتکل‌ها باشد.' },
        { id: 'mobile-strategy', title: 'استراتژی موبایل', desc: 'بهینه‌سازی برای دستگاه‌های همراه', text: 'استراتژی موبایل برای [نوع کسب‌وکار] طراحی کن که شامل اپلیکیشن، وب موبایل و تجربه کاربری باشد.' },
        { id: 'cloud-migration', title: 'مهاجرت به کلود', desc: 'انتقال به فضای ابری', text: 'طرح مهاجرت به کلود برای [نوع کسب‌وکار] تهیه کن که شامل انتخاب پلتفرم، مراحل و هزینه‌ها باشد.' }
      ]
    }
  };

  const filteredPrompts = promptCategories[selectedCategory].prompts.filter(prompt => {
    const matchesSearch = prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           prompt.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           prompt.text.toLowerCase().includes(searchTerm.toLowerCase());
    
    // اگر مرحله انتخاب شده باشد، فقط پرامپت‌های آن مرحله را نمایش بده
    if (selectedLevel) {
      return matchesSearch && prompt.level === selectedLevel;
    }
    
    // اگر مرحله انتخاب نشده باشد، همه پرامپت‌ها را نمایش بده
    return matchesSearch;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You can add a toast notification here
  };

  const usePrompt = (prompt: Prompt) => {
    // Check if we came from AI Coach page
    const fromAICoach = window.location.search.includes('from=ai-coach');
    const fromLevels = window.location.search.includes('from=levels');
    
    if (fromAICoach) {
      // Navigate back to AI Coach with the prompt text
      navigate('/ai-coach', { state: { promptText: prompt.text } });
    } else if (fromLevels) {
      // Get the stage ID from URL parameters
      const searchParams = new URLSearchParams(window.location.search);
      const stageParam = searchParams.get('stage');
      const stageId = stageParam ? parseInt(stageParam) : null;
      
      // Navigate back to levels page with the prompt text for editing
      navigate('/levels', { 
        state: { 
          promptText: prompt.text, 
          editMode: true,
          stageId: stageId 
        } 
      });
    } else {
      // Navigate to dashboard with the prompt text
      navigate('/', { state: { promptText: prompt.text } });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/30 via-black to-gray-900/30"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-800/10 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-gray-800/10 via-transparent to-transparent"></div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="w-12 h-12 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-gradient-to-br from-[#2c189a] to-[#5a189a] rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">پرامپت‌های آماده</h1>
              <p className="text-gray-400">مجموعه‌ای از پرامپت‌های حرفه‌ای برای بازاریابی و فروش</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Categories Filter */}
          <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-800/60" style={{ backgroundColor: '#10091D' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">دسته‌بندی‌ها</h2>
              <button
                onClick={() => {
                  if (selectedLevel) {
                    setSelectedLevel(null);
                  } else {
                    setShowLevelSelector(!showLevelSelector);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  selectedLevel 
                    ? 'bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white shadow-lg' 
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white'
                }`}
              >
                {selectedLevel ? `مرحله ${selectedLevel}` : 'انتخاب مرحله'}
              </button>
            </div>
            
            {/* Level Selector */}
            {showLevelSelector && (
              <div className="mb-6 p-4 bg-gray-800/30 rounded-2xl border border-gray-700/60">
                <h3 className="text-lg font-semibold text-white mb-4">انتخاب مرحله (۱ تا ۲۹)</h3>
                <div className="grid grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-2">
                  {Array.from({ length: 29 }, (_, i) => i + 1).map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        setSelectedLevel(level);
                        setShowLevelSelector(false);
                      }}
                      className={`p-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                        selectedLevel === level
                          ? 'bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white shadow-lg'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/70 hover:text-white'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                {selectedLevel && (
                  <button
                    onClick={() => setSelectedLevel(null)}
                    className="mt-3 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/30 transition-colors"
                  >
                    حذف انتخاب مرحله
                  </button>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(promptCategories).filter(([key]) => key !== 'levels').map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedCategory(key);
                    setSelectedLevel(null); // پاک کردن مرحله انتخاب شده
                  }}
                  className={`flex items-center gap-3 p-4 rounded-xl transition-all duration-300 text-left ${
                    selectedCategory === key
                      ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                      : 'bg-gray-800/50 hover:bg-gray-700/70 text-gray-300 hover:text-white'
                  }`}
                >
                  <span className="text-xl">{category.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{category.title}</div>
                    <div className={`text-xs ${selectedCategory === key ? 'text-white/80' : 'text-gray-400'}`}>
                      {category.prompts.length} پرامپت
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompts List */}
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="جستجو در پرامپت‌ها..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-3 bg-gray-800/70 border border-gray-700/60 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
              />
            </div>

            {selectedLevel && selectedCategory === 'levels' && (
              <div className="mb-6 p-4 bg-gradient-to-r from-[#2c189a]/20 to-[#5a189a]/20 rounded-2xl border border-[#5a189a]/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-[#2c189a] to-[#5a189a] rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{selectedLevel}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">مرحله {selectedLevel} انتخاب شده</h3>
                    <p className="text-gray-300 text-sm">پرامپت‌های مخصوص این مرحله نمایش داده می‌شوند</p>
                  </div>
                </div>
              </div>
            )}
            
            {filteredPrompts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="backdrop-blur-xl rounded-3xl p-6 border border-gray-800/60 hover:border-orange-500/50 transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
                style={{ backgroundColor: '#0A111C' }}
                    onClick={() => setSelectedPrompt(prompt)}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${promptCategories[selectedCategory].color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <Sparkles size={24} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">{prompt.title}</h3>
                        <p className="text-gray-300 text-sm">{prompt.desc}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(prompt.text);
                        }}
                        className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
                      >
                        <Copy size={16} />
                        کپی
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          usePrompt(prompt);
                        }}
                        className="flex-1 py-2 px-4 bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
                      >
                        <Sparkles size={16} />
                        استفاده
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 backdrop-blur-xl rounded-3xl p-6 border border-gray-800/60" style={{ backgroundColor: '#10091D' }}>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                  <Search size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-500">پرامپتی یافت نشد</p>
              </div>
            )}
          </div>
        </div>

        {/* Prompt Detail Modal */}
        {selectedPrompt && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700/60 shadow-2xl" style={{ backgroundColor: '#10091D' }}>
              <div className="flex items-center justify-between p-6 border-b border-gray-700/20">
                <h2 className="text-xl font-semibold text-white">
                  {selectedPrompt.title}
                </h2>
                <button
                  onClick={() => setSelectedPrompt(null)}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h3 className="font-semibold text-white mb-2">توضیحات</h3>
                  <p className="text-gray-300">{selectedPrompt.desc}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">محتوای پرامپت</h3>
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <pre className="text-gray-200 whitespace-pre-wrap text-sm leading-relaxed">
                      {selectedPrompt.text}
                    </pre>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-700/20">
                  <button
                    onClick={() => copyToClipboard(selectedPrompt.text)}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Copy size={16} />
                    کپی پرامپت
                  </button>
                  <button
                    onClick={() => usePrompt(selectedPrompt)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 text-white rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Sparkles size={16} />
                    استفاده
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadyPrompts; 