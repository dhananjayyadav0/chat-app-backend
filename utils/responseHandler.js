/**
 * Function to handle and send standardized API responses.
 *
 * @param {number} statusCode - The HTTP status code for the response (e.g., 200 for success).
 * @param {boolean} success - A flag indicating if the request was successful or not (true/false).
 * @param {string} message - A descriptive message providing information about the request result.
 *
 * This function standardizes the API responses, ensuring consistency across the application.
 */
export const sendResponse = (
  res,
  statusCode,
  success,
  message,
  data = null
) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
  });
};
