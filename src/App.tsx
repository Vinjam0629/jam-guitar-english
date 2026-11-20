import { useEffect, useState } from "react";
import {
  COURSE_DAYS,
  dialogs,
  lessons,
  orals,
  outline,
  quiz,
  weeks,
  type Lesson,
  type OutlineRow,
  type Q,
  type Role,
  type Tab,
  type Turn,
  type WeekKey,
} from "./course";
import { answerText, isCorrect, oralIndexForDay, weekForDay } from "./logic";
import { progress } from "./progress";
import { bindSpeakError, SPEAK_FAIL, speakEnglish, speakQueue } from "./speech";
import { readLastDay, writeLastDay } from "./storage";

const TABS: { value: Tab; label: string }[] = [
  { value: "today", label: "今日课" },
  { value: "words", label: "词表" },
  { value: "quiz", label: "小测" },
  { value: "dialog", label: "情景对话" },
  { value: "oral", label: "周口语测" },
  { value: "practice", label: "怎么练" },
];

const STEPS: { title: string; detail: string }[] = [
  {
    title: "听",
    detail:
      "点词或整句旁的「听」，用浏览器 speechSynthesis（en-US）跟读两遍；若提示不支持朗读，就自己出声读。",
  },
  {
    title: "说",
    detail: "不看中文把整句说出口；在「情景对话」里选「我扮演：技师」，只看中文先开口。",
  },
  { title: "测", detail: "打开「小测」选对应 Day 交卷，看解析；周末做「周口语测」。" },
  { title: "明日", detail: "先复述昨天句子，再学新课；按顶部「30天大纲」推进，不要堆词典。" },
];

const ABILITY =
  "已上线：听读（本机 speechSynthesis）、周1 Day1–Day7 课与小测（含解析）、顶部学习大纲（30 天 + 续课）、4 次周口语测 + 收尾口语测 + 通关口语测。Day8–Day31 已写入（词+句+小测+情景对话）。二期：情景对话跟读已上线（目前 Dialog1–31，可切换扮演角色、听整段）；周2–周4 与收尾对话已齐，Day31 起主题轮换加练。三期：录音后粗评，等麦克风方案稳定后再上。";

function Segmented({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={className ? `segmented ${className}` : "segmented"} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? "seg on" : "seg"}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Listen({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="listen" onClick={onClick}>
      听
    </button>
  );
}

export default function App() {
  const initialDay = readLastDay(COURSE_DAYS);
  const [week, setWeek] = useState<WeekKey>(() => weekForDay(Number(initialDay)));
  const [tab, setTab] = useState<Tab>("today");
  const [lessonId, setLessonId] = useState(initialDay);
  const [quizDay, setQuizDay] = useState(initialDay);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [dialogDay, setDialogDay] = useState(initialDay);
  const [role, setRole] = useState<Role>("jam");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [oralWeek, setOralWeek] = useState(() => oralIndexForDay(Number(initialDay)));
  const [showRef, setShowRef] = useState<Record<string, boolean>>({});
  const [speakHint, setSpeakHint] = useState("");
  const [savedDay, setSavedDay] = useState(initialDay);

  const lessonOptions = lessons.map((lesson) => ({ value: String(lesson[0]), label: `Day${lesson[0]}` }));
  const dialogOptions = dialogs.map((_, index) => ({ value: String(index + 1), label: `Dialog${index + 1}` }));
  const oralOptions = orals.map((_, index) => ({
    value: String(index),
    label: index < 4 ? `周${index + 1}` : index === 4 ? "收尾" : "通关",
  }));
  const wk = weeks.find((item) => item.key === week) ?? weeks[0];
  const weekRows = outline.filter((row) => row[0] >= wk.from && row[0] <= wk.to);
  const lesson = lessons.find((item) => String(item[0]) === lessonId) ?? lessons[0];
  const activeQuiz = quiz
    .map((item, index) => ({ q: item, key: `q${index}` }))
    .filter((item) => String(item.q[0]) === quizDay);
  const dialog = dialogs[Number(dialogDay) - 1] ?? dialogs[0];
  const oral = orals[Number(oralWeek)] ?? orals[0];
  const score = activeQuiz.filter((item) => isCorrect(item.q, answers[item.key])).length;
  const answeredCount = activeQuiz.filter((item) => (answers[item.key] ?? "").trim() !== "").length;
  const wordCount = lessons.reduce((sum, item) => sum + item[6].length, 0);
  const jamCode = role === "jam" ? "J" : "C";

  useEffect(() => {
    bindSpeakError(() => setSpeakHint(SPEAK_FAIL));
  }, []);

  useEffect(() => {
    document.title = `Day ${lessonId} · 吉他维修英语 · 随身课`;
  }, [lessonId]);

  useEffect(() => {
    writeLastDay(lessonId);
    setSavedDay(lessonId);
  }, [lessonId]);

  function onSpeak(text: string): void {
    setSpeakHint(speakEnglish(text) ? "" : SPEAK_FAIL);
  }

  function onSpeakAll(texts: string[]): void {
    setSpeakHint(speakQueue(texts) ? "" : SPEAK_FAIL);
  }

  function studyLesson(day: string): void {
    setLessonId(day);
    setWeek(weekForDay(Number(day)));
    setTab("today");
  }

  function setAnswer(key: string, value: string): void {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function changeQuizDay(day: string): void {
    setQuizDay(day);
    setAnswers({});
    setSubmitted(false);
    writeLastDay(day);
    setSavedDay(day);
  }

  function changeDialogDay(day: string): void {
    setDialogDay(day);
    setRevealed({});
    writeLastDay(day);
    setSavedDay(day);
  }

  function changeRole(value: string): void {
    if (value !== "jam" && value !== "customer") return;
    setRole(value);
    setRevealed({});
  }

  function changeWeek(value: string): void {
    if (weeks.some((item) => item.key === value)) setWeek(value as WeekKey);
  }

  function changeTab(value: string): void {
    if (TABS.some((item) => item.value === value)) setTab(value as Tab);
  }

  return (
    <>
      <a className="skip" href="#course">
        跳到课文
      </a>
      <header className="top">
        <div className="shell">
          <p className="kicker">English for the bench</p>
          <h1>吉他维修英语 · 随身课</h1>
          <p className="summary">
            给杭州吉他技师 Jam 的每日口语小课：维修术语 + 讨价还价开口。高中～CET4 难度，能听能测，可反复打开复习。
          </p>
          <p className="ios-note">iPhone Safari：分享 →「添加到主屏幕」。</p>
          <p className="saved">这台手机记着上次学到的 Day {savedDay}。不用登录。</p>
        </div>
      </header>

      <main id="course" className="shell">
        <section className="card" aria-labelledby="outline-title">
          <details open>
            <summary id="outline-title">学习大纲</summary>
            <p>
              前 30 天是完整计划（4 周主题 + 2 天收尾）。从 Day31 起按主题轮换加练：品丝/琴颈/setup/面板 → 拾音器与琴桥
              → 虚焊与旋钮 → 讨价还价与交付。每天一个主题、一组核心术语、一句柜台句型和一种小测。
            </p>
            <Segmented
              label="周次"
              className="wrap"
              options={weeks.map((item) => ({ value: item.key, label: item.label }))}
              value={week}
              onChange={changeWeek}
            />
            <p className="week-line">{`${wk.label} · ${wk.name}（Day${wk.from}–Day${wk.to}）`}</p>
            <div className="outline">
              {weekRows.map((row) => (
                <OutlineCard key={row[0]} row={row} active={String(row[0]) === lessonId} onOpen={studyLesson} />
              ))}
            </div>
          </details>
        </section>

        <nav className="tabs" aria-label="课程栏目">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={tab === item.value ? "tab on" : "tab"}
              aria-current={tab === item.value ? "page" : undefined}
              onClick={() => changeTab(item.value)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {speakHint ? (
          <p className="speak-hint" role="status">
            {speakHint}
          </p>
        ) : null}

        {tab === "today" ? (
          <Today
            lesson={lesson}
            lessonId={lessonId}
            lessonOptions={lessonOptions}
            onLesson={(day) => {
              setLessonId(day);
              setWeek(weekForDay(Number(day)));
            }}
            onSpeak={onSpeak}
          />
        ) : null}

        {tab === "words" ? <Words wordCount={wordCount} onSpeak={onSpeak} /> : null}

        {tab === "quiz" ? (
          <Quiz
            quizDay={quizDay}
            lessonOptions={lessonOptions}
            activeQuiz={activeQuiz}
            answers={answers}
            submitted={submitted}
            score={score}
            answeredCount={answeredCount}
            onDay={changeQuizDay}
            onAnswer={setAnswer}
            onSubmit={() => setSubmitted(true)}
            onReset={() => {
              setAnswers({});
              setSubmitted(false);
            }}
          />
        ) : null}

        {tab === "dialog" ? (
          <DialogPane
            dialogDay={dialogDay}
            dialogOptions={dialogOptions}
            dialog={dialog}
            role={role}
            jamCode={jamCode}
            revealed={revealed}
            onDay={changeDialogDay}
            onRole={changeRole}
            onReveal={(key, value) => setRevealed((prev) => ({ ...prev, [key]: value }))}
            onSpeak={onSpeak}
            onSpeakAll={onSpeakAll}
          />
        ) : null}

        {tab === "oral" ? (
          <OralPane
            oralWeek={oralWeek}
            oralOptions={oralOptions}
            oral={oral}
            showRef={showRef}
            onWeek={(value) => {
              setOralWeek(value);
              setShowRef({});
            }}
            onToggle={(key, value) => setShowRef((prev) => ({ ...prev, [key]: value }))}
            onSpeak={onSpeak}
          />
        ) : null}

        {tab === "practice" ? <Practice /> : null}

        <footer className="foot">
          <p>课文都在这台手机里，打开不需要登录，也不用再去网上拉课文。</p>
          <p>iPhone 想放到桌面：Safari 分享 →「添加到主屏幕」。</p>
        </footer>
      </main>
    </>
  );
}

function OutlineCard({
  row,
  active,
  onOpen,
}: {
  row: OutlineRow;
  active: boolean;
  onOpen: (day: string) => void;
}) {
  return (
    <button type="button" className={active ? "outline-card on" : "outline-card"} onClick={() => onOpen(String(row[0]))}>
      <span className="od">D{row[0]}</span>
      <span className="otitle">{row[1]}</span>
      <span className="oterms">{row[2]}</span>
      <span className="osentence" lang="en">
        {row[3]}
      </span>
      <span className="okind">{row[4]}</span>
    </button>
  );
}

function Today({
  lesson,
  lessonId,
  lessonOptions,
  onLesson,
  onSpeak,
}: {
  lesson: Lesson;
  lessonId: string;
  lessonOptions: { value: string; label: string }[];
  onLesson: (day: string) => void;
  onSpeak: (text: string) => void;
}) {
  return (
    <>
      <section className="card">
        <h2>选课</h2>
        <Segmented label="选择一天" className="days" options={lessonOptions} value={lessonId} onChange={onLesson} />
      </section>

      <section className="card">
        <h2>{`第 ${lesson[0]} 课 · ${lesson[2]}`}</h2>
        <dl className="props">
          <div>
            <dt>计划日期</dt>
            <dd>{lesson[1]}</dd>
          </div>
          <div>
            <dt>主题</dt>
            <dd>{lesson[3]}</dd>
          </div>
          <div>
            <dt>焦点</dt>
            <dd>{lesson[4]}</dd>
          </div>
          <div>
            <dt>目标</dt>
            <dd>5–8 词能认 + 2–3 句能脱口</dd>
          </div>
          <div>
            <dt>学员</dt>
            <dd>杭州吉他技师 Jam · 高中～CET4</dd>
          </div>
        </dl>
        <aside className="callout">
          <p className="lead">{`Day${lesson[0]} 开口重点`}</p>
          <p>{lesson[5]}</p>
        </aside>
      </section>

      <section className="card">
        <h2>今日词（点「听」跟读）</h2>
        <ul className="words">
          {lesson[6].map((word, index) => (
            <li key={`${lesson[0]}-${word[0]}-${index}`} className="word">
              <div>
                <p className="en" lang="en">
                  {word[0]}
                </p>
                <p className="zh">{word[1]}</p>
                <p className="tip">{word[2]}</p>
              </div>
              <Listen onClick={() => onSpeak(word[0])} />
            </li>
          ))}
        </ul>
        <p className="reminder">
          口径提醒：对国内客人仍说「琴颈钢筋」；跟外国客人只说 truss rod，不要直译 neck steel。例句不硬塞寄修价目或质保。
        </p>
      </section>

      <section className="card">
        <h2>可直接说出口的句子</h2>
        <ol className="sentences">
          {lesson[7].map((line, index) => (
            <li key={`${lesson[0]}-line-${index}`}>
              <p className="cite">{`句 ${index + 1}`}</p>
              <blockquote lang="en">{line[0]}</blockquote>
              <p className="zh">{line[1]}</p>
              <Listen onClick={() => onSpeak(line[0])} />
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2>本课进度（系统记录）</h2>
        <ul className="checks">
          {progress.map((item) => (
            <li key={item.text}>
              <span className="tick" aria-hidden="true">
                ✓
              </span>
              <span>
                <span className="check-text">{item.text}</span>
                <span className="meta">{item.meta}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Words({ wordCount, onSpeak }: { wordCount: number; onSpeak: (text: string) => void }) {
  const lastDay = lessons[lessons.length - 1][0];
  return (
    <section className="card">
      <h2>累计词表（按课）</h2>
      <p>{`目前累计到 Day${lastDay}，共 ${wordCount} 条。之后每课追加。`}</p>
      {lessons.map((lesson) => (
        <div key={lesson[0]} className="word-group">
          <h3>{`Day${lesson[0]} · ${lesson[2]}`}</h3>
          <ul className="words compact">
            {lesson[6].map((word, index) => (
              <li key={`${lesson[0]}-${word[0]}-${index}`} className="word">
                <div>
                  <p className="en" lang="en">
                    {word[0]}
                  </p>
                  <p className="zh">{word[1]}</p>
                </div>
                <Listen onClick={() => onSpeak(word[0])} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Quiz({
  quizDay,
  lessonOptions,
  activeQuiz,
  answers,
  submitted,
  score,
  answeredCount,
  onDay,
  onAnswer,
  onSubmit,
  onReset,
}: {
  quizDay: string;
  lessonOptions: { value: string; label: string }[];
  activeQuiz: { q: Q; key: string }[];
  answers: Record<string, string>;
  submitted: boolean;
  score: number;
  answeredCount: number;
  onDay: (day: string) => void;
  onAnswer: (key: string, value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
}) {
  return (
    <>
      <section className="card">
        <h2>小测选课</h2>
        <Segmented label="小测天数" className="days" options={lessonOptions} value={quizDay} onChange={onDay} />
        <p>{`Day${quizDay} · 共 ${activeQuiz.length} 题。选择题点选项，填空和翻译题直接输入，再点「交卷」看得分和解析。`}</p>
        <dl className="props inline">
          <div>
            <dt>已答</dt>
            <dd>{`${answeredCount} / ${activeQuiz.length}`}</dd>
          </div>
          <div>
            <dt>状态</dt>
            <dd>{submitted ? `已交卷 · ${score} / ${activeQuiz.length}` : "未交卷"}</dd>
          </div>
        </dl>
      </section>

      {activeQuiz.map((item, index) => {
        const q = item.q;
        const given = answers[item.key];
        const ok = isCorrect(q, given);
        const options = q[3];
        return (
          <section key={item.key} className="card">
            <h2>{`第 ${index + 1} 题 · ${q[1]}`}</h2>
            <p className="prompt">{q[2]}</p>
            {options ? (
              <div className="choices">
                {options.map((label, optionIndex) => {
                  const chosen = given === String(optionIndex);
                  const classes = ["choice"];
                  if (chosen) classes.push("on");
                  if (submitted && chosen && ok) classes.push("good");
                  if (submitted && chosen && !ok) classes.push("bad");
                  return (
                    <button
                      key={`${item.key}-${optionIndex}`}
                      type="button"
                      className={classes.join(" ")}
                      disabled={submitted}
                      onClick={() => onAnswer(item.key, String(optionIndex))}
                    >
                      {`${String.fromCharCode(65 + optionIndex)}. ${label}`}
                    </button>
                  );
                })}
              </div>
            ) : (
              <label className="field">
                <span>你的答案</span>
                <input
                  value={given ?? ""}
                  placeholder="输入英文"
                  readOnly={submitted}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={(event) => onAnswer(item.key, event.target.value)}
                />
              </label>
            )}
            {submitted ? (
              <>
                {ok ? (
                  <p className="status good">正确</p>
                ) : (
                  <p className="status bad">{`未对 · 正解 ${answerText(q)}`}</p>
                )}
                <p className="explain">{`解析：${q[5]}`}</p>
              </>
            ) : null}
          </section>
        );
      })}

      <section className="card">
        <h2>交卷</h2>
        {!submitted ? (
          <button type="button" className="primary" disabled={answeredCount < activeQuiz.length} onClick={onSubmit}>
            交卷看得分
          </button>
        ) : (
          <>
            <aside className="callout success">
              <p className="lead">本课得分</p>
              <p>{`你答对 ${score} / ${activeQuiz.length} 题。错题看解析，再回「今日课」听一遍对应词句。`}</p>
            </aside>
            <button type="button" className="quiet" onClick={onReset}>
              再测一次
            </button>
          </>
        )}
        {!submitted && answeredCount < activeQuiz.length ? (
          <p>{`还差 ${activeQuiz.length - answeredCount} 题未答。`}</p>
        ) : null}
      </section>
    </>
  );
}

function DialogPane({
  dialogDay,
  dialogOptions,
  dialog,
  role,
  jamCode,
  revealed,
  onDay,
  onRole,
  onReveal,
  onSpeak,
  onSpeakAll,
}: {
  dialogDay: string;
  dialogOptions: { value: string; label: string }[];
  dialog: (typeof dialogs)[number];
  role: Role;
  jamCode: "J" | "C";
  revealed: Record<string, boolean>;
  onDay: (day: string) => void;
  onRole: (value: string) => void;
  onReveal: (key: string, value: boolean) => void;
  onSpeak: (text: string) => void;
  onSpeakAll: (texts: string[]) => void;
}) {
  return (
    <>
      <section className="card">
        <h2>选对话</h2>
        <Segmented label="对话" className="days" options={dialogOptions} value={dialogDay} onChange={onDay} />
        <Segmented
          label="扮演角色"
          className="wrap"
          options={[
            { value: "jam", label: "我扮演：技师" },
            { value: "customer", label: "我扮演：客人" },
          ]}
          value={role}
          onChange={onRole}
        />
        <p>你扮演的角色只显示中文：先自己用英语说出口，再点「看英文」对照，最后点「听」跟读。</p>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>{`Dialog${dialogDay} · ${dialog[0]}`}</h2>
          <button type="button" className="primary" onClick={() => onSpeakAll(dialog[1].map((turn) => turn[1]))}>
            听整段
          </button>
        </div>
        <ol className="turns">
          {dialog[1].map((turn, index) => {
            const key = `${dialogDay}-${index}`;
            const mine = turn[0] === jamCode;
            const showEn = !mine || revealed[key] === true;
            const who = turn[0] === "C" ? "客人 Customer" : "技师 Jam";
            return (
              <li key={key}>
                <TurnView turn={turn} who={who} mine={mine} showEn={showEn} />
                {mine ? (
                  <button
                    type="button"
                    className={revealed[key] ? "toggle on" : "toggle"}
                    aria-pressed={revealed[key] === true}
                    onClick={() => onReveal(key, revealed[key] !== true)}
                  >
                    看英文
                  </button>
                ) : null}
                <Listen onClick={() => onSpeak(turn[1])} />
              </li>
            );
          })}
        </ol>
      </section>

      <section className="card">
        <h2>本段关键词</h2>
        <ul className="words compact">
          {dialog[2].map((keyword, index) => (
            <li key={`${keyword[0]}-${index}`} className="word">
              <div>
                <p className="en" lang="en">
                  {keyword[0]}
                </p>
                <p className="zh">{keyword[1]}</p>
              </div>
              <Listen onClick={() => onSpeak(keyword[0])} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function TurnView({
  turn,
  who,
  mine,
  showEn,
}: {
  turn: Turn;
  who: string;
  mine: boolean;
  showEn: boolean;
}) {
  return (
    <>
      {showEn ? (
        <blockquote lang="en">{turn[1]}</blockquote>
      ) : (
        <blockquote>{turn[2]}</blockquote>
      )}
      <p className="cite">
        {showEn ? `${who}${mine ? "（你）" : ""} · ${turn[2]}` : `${who}（你）· 先用英语说出这句`}
      </p>
    </>
  );
}

function OralPane({
  oralWeek,
  oralOptions,
  oral,
  showRef,
  onWeek,
  onToggle,
  onSpeak,
}: {
  oralWeek: string;
  oralOptions: { value: string; label: string }[];
  oral: (typeof orals)[number];
  showRef: Record<string, boolean>;
  onWeek: (value: string) => void;
  onToggle: (key: string, value: boolean) => void;
  onSpeak: (text: string) => void;
}) {
  return (
    <>
      <section className="card">
        <h2>选周</h2>
        <Segmented label="口语测" className="wrap" options={oralOptions} value={oralWeek} onChange={onWeek} />
        <p>看中文，大声用英语说出来；说完再打开参考答案对照，点「听」跟读一遍。</p>
      </section>
      <section className="card">
        <h2>{`周口语测 · ${oral[0]}`}</h2>
        <ol className="oral-list">
          {oral[1].map((prompt, index) => {
            const key = `${oralWeek}-${index}`;
            const open = showRef[key] === true;
            return (
              <li key={key}>
                <p className="prompt">{`${index + 1}. ${prompt[0]}`}</p>
                <button
                  type="button"
                  className={open ? "toggle on" : "toggle"}
                  aria-pressed={open}
                  onClick={() => onToggle(key, !open)}
                >
                  看参考答案
                </button>
                {open ? (
                  <>
                    <p className="cite">参考答案</p>
                    <blockquote lang="en">{prompt[1]}</blockquote>
                  </>
                ) : null}
                <Listen onClick={() => onSpeak(prompt[1])} />
              </li>
            );
          })}
        </ol>
      </section>
      <section className="card">
        <h2>自查标准</h2>
        <ul className="bullets">
          {oral[2].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Practice() {
  return (
    <>
      <section className="card">
        <h2>怎么练（先能说再能测）</h2>
        <ol className="steps">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="step-no">{index + 1}</span>
              <span>
                <span className="step-title">{step.title}</span>
                <span className="step-detail">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
        <aside className="callout">
          <p className="lead">放到主屏幕</p>
          <p>iPhone 用 Safari 打开本页，点底部分享按钮，再点「添加到主屏幕」，之后可以像 App 一样打开。</p>
          <p>微信里点「听」如果没声音，会显示：{SPEAK_FAIL}</p>
        </aside>
      </section>
      <section className="card">
        <h2>能力分期</h2>
        <aside className="callout">
          <p className="lead">能力分期</p>
          <p>{ABILITY}</p>
        </aside>
      </section>
    </>
  );
}
