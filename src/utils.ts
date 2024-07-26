export const genericCatch = (error: any, reject: (error: any) => void) => {
  switch (error.status) {
    case 401:
      reject(error);
      break;
    default:
      reject(error);
      break;
  }
};

export const invalidInvocationError = (reject: (error: any) => void) => {
  const invalidInvocationErrorInstance = new Error(
    'This method should not be called on the frontend',
  );
  return genericCatch(invalidInvocationErrorInstance, reject);
};
