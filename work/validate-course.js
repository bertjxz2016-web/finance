const fs = require("fs");

const html = fs.readFileSync("outputs/index.html", "utf8");
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]).join("\n");
const setup = script.slice(0, script.indexOf("const streakRewards"));
const validate = new Function(`${setup}
  const tests = courseItems.filter((item) => item.kind === "bigTest");
  const moduleAnswers = courseModules.flatMap((module) => [
    ...module.lessons.flatMap((lesson) =>
      lesson.pages.filter((page) => page.type === "practice").map((page) => ({ answer: page.answer, options: page.options }))
    ),
    ...module.quizQuestions.map((question) => ({ answer: question.answer, options: question.options }))
  ]);
  const testAnswers = tests.flatMap((test) => test.questions.map((question) => ({ answer: question.answer, options: question.options })));
  const allAnswers = [...moduleAnswers, ...testAnswers];
  const correctLongestCount = allAnswers.filter((question) => {
    const correctLength = question.options[question.answer].length;
    return question.options.every((option) => correctLength >= option.length);
  }).length;
  const spreads = allAnswers.map((question) => {
    const lengths = question.options.map((option) => option.length);
    return Math.max(...lengths) - Math.min(...lengths);
  });
  const maxLengthSpread = Math.max(...spreads);
  const closeLengthCount = spreads.filter((spread) => spread <= 35).length;
  return {
    modules: courseModules.length,
    moduleOk: courseModules.every((module) =>
      module.lessons.length === 10 &&
      module.lessons.every((lesson) =>
        lesson.pages.length === 9 &&
        lesson.pages[0].type === "text" &&
        lesson.pages.filter((page) => page.type === "text").length === 1 &&
        lesson.pages.filter((page) => page.type === "practice").length === 8
      ) &&
      module.quizQuestions.length === 15 &&
      module.quizQuestions.filter((question) => question.type === "mc").length === 10 &&
      module.quizQuestions.filter((question) => question.type === "sim").length === 5
    ),
    tests: tests.length,
    testsOk: tests.every((test) =>
      test.questions.length === 30 &&
      test.questions.filter((question) => question.type === "mc").length === 21 &&
      test.questions.filter((question) => question.type === "sim").length === 9
    ),
    courseItems: courseItems.length,
    answerPositions: [...new Set(allAnswers.map((question) => question.answer))].sort(),
    answersScrambled: new Set(allAnswers.map((question) => question.answer)).size > 1,
    correctLongestCount,
    totalQuestions: allAnswers.length,
    correctNotAlwaysLongest: correctLongestCount < allAnswers.length,
    maxLengthSpread,
    closeLengthCount,
    answersAboutSameLength: closeLengthCount === allAnswers.length
  };
`);

console.log(JSON.stringify(validate(), null, 2));
