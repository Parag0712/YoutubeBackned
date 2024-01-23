const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}

export { asyncHandler }


// Using Try Catch
// const asyncHandler = () => {}
// const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => async () => {}

/*
    const asyncHandler = (fn) => async (req, res, nex) => {
        try {
            await fu(req, res, next)
        } catch (error) {
            res.status(err.code || 500).json({
                success: false,
                message: err.message
            })
        }
    }
*/
/*
// Regular function syntax
function asyncHandler2(fn) {
    // This function returns a new function (middleware)
    return async function middleware(req, res, next) {
        try {
            // Inside the middleware function, we await the asynchronous function (fn)
            await fn(req, res, next);
        } catch (error) {
            // If there's an error, handle it by sending a JSON response with an error message
            res.status(error.code || 500).json({
                success: false,
                message: error.message,
            });
        }
    };
}

// Example asynchronous function
async function myAsyncFunction(req, res, next) {
    // Async function body
    // You can throw an error to simulate an error condition
    // throw { code: 400, message: 'An error occurred' };
    next(); // Call the next middleware or route handler
}

  // Wrap the asynchronous function using asyncHandler
    const wrappedFunction = asyncHandler(myAsyncFunction);

  // Later, you can use the wrapped function as middleware
    wrappedFunction(req, res, next); // Assuming req, res, and next are defined


*/