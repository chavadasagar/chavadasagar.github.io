export const localStorageCRUD = {
    create: (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    },
    read: key => {
        return JSON.parse(localStorage.getItem(key));
    },
    update: (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    },
    delete: key => {
        localStorage.removeItem(key);
    }
};

export function crudOperation(operation="get", data) {
    switch (operation) {
        case 'post':
            // Get the existing data from local storage
            var obj = JSON.parse(localStorage.getItem('obj')) || [];
            // Add the new todo to the array
            obj.push(data);
            // Save the updated array back to local storage
            localStorage.setItem('obj', JSON.stringify(obj));
            break;
        case 'get':
            // Get the data from local storage
            var obj = JSON.parse(localStorage.getItem('obj')) || [];
            // Return the data
            return obj;
            break;
        case 'put':
            // Get the existing data from local storage
            var obj = JSON.parse(localStorage.getItem('obj')) || [];
            // Find the index of the todo to update
            index = obj.findIndex((todo) => todo.id === data.id);
            // Update the todo at the specified index
            obj[index] = data;
            // Save the updated array back to local storage
            localStorage.setItem('obj', JSON.stringify(obj));
            break;
        case 'delete':
            debugger
            // Get the existing data from local storage
            var obj = JSON.parse(localStorage.getItem('obj')) || [];
            // Filter out the todo to delete
            obj = obj.filter((todo) => todo.id != data.id);
            // Save the updated array back to local storage
            localStorage.setItem('obj', JSON.stringify(obj));
            break;
        default:
            console.error('Invalid operation');
    }
}