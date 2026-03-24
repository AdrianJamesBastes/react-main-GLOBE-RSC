function getGoogleScriptRunner() {
  return window.google?.script?.run || null;
}

export function hasGoogleScriptRuntime() {
  return Boolean(getGoogleScriptRunner());
}

export function processCSVComparisonRemote(file1Text, file2Text) {
  return new Promise((resolve, reject) => {
    const runner = getGoogleScriptRunner();
    if (!runner) {
      reject(new Error('Google Apps Script runtime is unavailable.'));
      return;
    }

    runner
      .withSuccessHandler((responseRaw) => {
        try {
          const response = typeof responseRaw === 'string' ? JSON.parse(responseRaw) : responseRaw;
          if (response?.success) {
            resolve(response.data);
            return;
          }
          reject(new Error(response?.error || 'Unknown Apps Script response error.'));
        } catch (error) {
          reject(error);
        }
      })
      .withFailureHandler((error) => {
        reject(error instanceof Error ? error : new Error(error?.message || String(error)));
      })
      .processCSVComparison(file1Text, file2Text);
  });
}

export function processAIAgentCommandRemote(userMessage, dataString) {
  return new Promise((resolve, reject) => {
    const runner = getGoogleScriptRunner();
    if (!runner) {
      reject(new Error('Google Apps Script runtime is unavailable.'));
      return;
    }

    runner
      .withSuccessHandler(resolve)
      .withFailureHandler((error) => {
        reject(error instanceof Error ? error : new Error(error?.message || String(error)));
      })
      .processAIAgentCommand(userMessage, dataString);
  });
}

export default {
  hasGoogleScriptRuntime,
  processCSVComparisonRemote,
  processAIAgentCommandRemote
};
