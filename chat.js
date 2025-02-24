document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const chatList = document.querySelector('.chat-list');
    const noChatsMessage = document.querySelector('.no-chats-message');
    const chatInput = document.querySelector('.chat-input');
    
    // Clear all chat-related data from localStorage
    localStorage.removeItem('savedChats');
    localStorage.removeItem('currentChatId');
    localStorage.removeItem('userMemory');
    
    // Clear any existing chat-specific memory
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('memory-') || key.startsWith('chat-')) {
            localStorage.removeItem(key);
        }
    });
    
    // Ensure chat list is empty and no-chats message is visible
    chatList.innerHTML = '';
    chatList.style.display = 'none';
    noChatsMessage.style.display = 'flex';
    
    // Clear messages container
    document.querySelector('.messages-container').innerHTML = '';
    
    // Initialize with default values
    let currentChatId = 'default-chat';
    let userMemory = {};
    
    // Auto-expand textarea
    function autoExpand(field) {
        // Reset field height
        field.style.height = 'inherit';

        // Get the computed styles for the element
        const computed = window.getComputedStyle(field);

        // Calculate the height
        const height = parseInt(computed.getPropertyValue('border-top-width'), 10)
                    + parseInt(computed.getPropertyValue('padding-top'), 10)
                    + field.scrollHeight
                    + parseInt(computed.getPropertyValue('padding-bottom'), 10)
                    + parseInt(computed.getPropertyValue('border-bottom-width'), 10);

        field.style.height = `${height}px`;
    }

    chatInput.addEventListener('input', (e) => {
        autoExpand(e.target);
    });

    // Reset height on focus to handle content clearing
    chatInput.addEventListener('focus', (e) => {
        autoExpand(e.target);
    });

    // Initial call to set proper height
    autoExpand(chatInput);

    // Toggle sidebar on menu button click
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        menuToggle.classList.toggle('active');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
                menuToggle.classList.remove('active');
            }
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            menuToggle.classList.remove('active');
        }
    });

    // Function to add a new chat to the list
    function addChatToList(chatTitle, chatData) {
        const li = document.createElement('li');
        li.innerHTML = `
            <a href="#" class="chat-item" data-chat='${JSON.stringify(chatData)}'>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="chat-title">${chatTitle}</span>
                <button class="delete-btn" title="Delete chat">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </a>
        `;
        
        chatList.appendChild(li);
        updateChatListVisibility();
        
        // Add click event to load chat
        const chatItem = li.querySelector('.chat-item');
        const deleteBtn = chatItem.querySelector('.delete-btn');
        
        // Add separate click handler for delete button
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this chat?')) {
                deleteChat(chatItem);
            }
        });
        
        // Add click handler for chat item
        chatItem.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-btn')) {
                e.preventDefault();
                const chatData = JSON.parse(chatItem.dataset.chat);
                loadChat(chatData);
                
                // Update active state
                document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
                chatItem.classList.add('active');
            }
        });
    }

    // Function to update chat list visibility
    function updateChatListVisibility() {
        const hasChats = chatList.children.length > 0;
        chatList.classList.toggle('has-chats', hasChats);
        noChatsMessage.style.display = hasChats ? 'none' : 'flex';
        chatList.style.display = hasChats ? 'flex' : 'none';
    }

    // Function to save current chat
    window.saveCurrentChat = () => {
        const messagesContainer = document.querySelector('.messages-container');
        const messages = [];
        
        // Collect all messages except typing indicators
        messagesContainer.querySelectorAll('.message-group:not(.typing-indicator)').forEach(group => {
            messages.push({
                sender: group.classList.contains('user') ? 'user' : 'appy',
                text: group.querySelector('p').textContent
            });
        });
        
        if (messages.length === 0) {
            alert('No messages to save!');
            return;
        }
        
        // Generate chat title from first message
        const firstUserMessage = messages.find(m => m.sender === 'user')?.text || 'New Chat';
        const chatTitle = firstUserMessage.slice(0, 30) + (firstUserMessage.length > 30 ? '...' : '');
        
        // Check if this chat already exists
        const existingChat = document.querySelector(`.chat-item[data-chat*="${firstUserMessage.slice(0, 30)}"]`);
        if (existingChat) {
            // Update existing chat
            const chatData = {
                title: chatTitle,
                messages: messages,
                timestamp: Date.now()
            };
            existingChat.dataset.chat = JSON.stringify(chatData);
            
            // Update in localStorage
            const savedChats = JSON.parse(localStorage.getItem('savedChats') || '[]');
            const chatIndex = savedChats.findIndex(chat => chat.title === chatTitle);
            if (chatIndex !== -1) {
                savedChats[chatIndex] = chatData;
            } else {
                savedChats.push(chatData);
            }
            localStorage.setItem('savedChats', JSON.stringify(savedChats));
            return;
        }
        
        // Save new chat
        const chatData = {
            title: chatTitle,
            messages: messages,
            timestamp: Date.now()
        };
        
        // Save to localStorage
        const savedChats = JSON.parse(localStorage.getItem('savedChats') || '[]');
        savedChats.push(chatData);
        localStorage.setItem('savedChats', JSON.stringify(savedChats));
        
        // Add to sidebar
        addChatToList(chatTitle, chatData);
    };

    // Function to load a chat
    function loadChat(chatData) {
        const messagesContainer = document.querySelector('.messages-container');
        // Clear current messages
        messagesContainer.innerHTML = '';
        
        // Set current chat ID to the loaded chat's timestamp
        currentChatId = chatData.timestamp.toString();
        localStorage.setItem('currentChatId', currentChatId);
        
        // Load saved messages
        chatData.messages.forEach(message => {
            addMessageToChat(message.sender, message.text);
            // Update memory if there's a name in the message
            if (message.sender === 'user') {
                updateUserMemory(message.text, '');
            }
        });
    }

    // Load saved chats from localStorage
    function loadSavedChats() {
        const savedChats = JSON.parse(localStorage.getItem('savedChats') || '[]');
        savedChats.forEach(chatData => addChatToList(chatData.title, chatData));
    }

    // Initialize star background
    initStarBackground();
    
    // Modify the memory handling to be chat-specific
    function updateUserMemory(message, response) {
        // Extract user information from messages
        const nameMatch = message.match(/(?:my name is|i am|i'm|call me) (\w+)/i);
        if (nameMatch) {
            // Store memory specific to current chat
            const chatMemory = {
                name: nameMatch[1],
                timestamp: Date.now(),
                chatId: currentChatId
            };
            localStorage.setItem(`memory-${currentChatId}`, JSON.stringify(chatMemory));
        }
    }

    // Function to get current chat's memory
    function getCurrentChatMemory() {
        const chatMemory = localStorage.getItem(`memory-${currentChatId}`);
        return chatMemory ? JSON.parse(chatMemory) : {};
    }

    function saveMessageToMemory(sender, text, type = 'text', attachment = null) {
        const messages = JSON.parse(localStorage.getItem(`chat-${currentChatId}`) || '[]');
        messages.push({
            sender,
            text,
            type,
            attachment,
            timestamp: Date.now()
        });
        localStorage.setItem(`chat-${currentChatId}`, JSON.stringify(messages));
    }

    function loadChatMemory() {
        const messages = JSON.parse(localStorage.getItem(`chat-${currentChatId}`) || '[]');
        const messagesContainer = document.querySelector('.messages-container');
        messagesContainer.innerHTML = '';
        
        messages.forEach(message => {
            if (message.type === 'text') {
                addMessageToChat(message.sender, `<p>${message.text}</p>`);
            } else if (message.type === 'image') {
                const imageMessage = `
                    <div class="attachment-container">
                        <img src="${message.attachment}" alt="Attached image" style="max-width: ${message.width}px; max-height: ${message.height}px;">
                        ${message.text ? `<p class="attachment-message">${message.text}</p>` : ''}
                    </div>
                `;
                addMessageToChat(message.sender, imageMessage);
            } else if (message.type === 'document') {
                const documentMessage = `
                    <div class="attachment-container">
                        <div class="document-attachment">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" stroke-width="2"/>
                                <polyline points="13 2 13 9 20 9"/>
                            </svg>
                            <span>${message.attachment}</span>
                        </div>
                        ${message.text ? `<p class="attachment-message">${message.text}</p>` : ''}
                    </div>
                `;
                addMessageToChat(message.sender, documentMessage);
            }
        });
    }

    // Modify the sendMessage function to save messages
    window.sendMessage = async () => {
        const input = document.querySelector('.chat-input');
        const message = input.value.trim();
        
        if (!message && !currentAttachment) return;
        
        // Clear input and attachment
        input.value = '';
        autoExpand(input);

        if (currentAttachment) {
            // Add message with attachment
            if (currentAttachment.type.startsWith('image/')) {
                handleImageAttachment(currentAttachment, message);
            } else {
                handleDocumentAttachment(currentAttachment, message);
            }
            
            // Clear attachment
            removeAttachment();
        } else {
            // Add text-only message
            addMessageToChat('user', `<p>${message}</p>`);
            saveMessageToMemory('user', message, 'text');
        }
        
        try {
            // Show typing indicator
            showTypingIndicator();
            
            // Call Gemini API
            const response = await getGeminiResponse(message);
            
            // Remove typing indicator and add response
            removeTypingIndicator();
            addMessageToChat('appy', `<p>${response}</p>`);
            saveMessageToMemory('appy', response, 'text');
        } catch (error) {
            console.error('Error:', error);
            removeTypingIndicator();
            const errorMessage = 'Sorry, I encountered an error. Please try again.';
            addMessageToChat('appy', `<p>${errorMessage}</p>`);
            saveMessageToMemory('appy', errorMessage, 'text');
        }
    };

    function addMessageToChat(sender, text, messageId = null) {
        const messagesContainer = document.querySelector('.messages-container');
        const messageGroup = document.createElement('div');
        messageGroup.className = `message-group ${sender}`;
        if (messageId) messageGroup.id = messageId;
        
        let actionButtons = '';
        if (sender === 'appy') {
            actionButtons = `
                <div class="message-actions">
                    <button class="action-btn" title="Copy response" onclick="copyText('${text.replace(/'/g, "\\'")}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="action-btn" title="Thumbs up" onclick="rateResponse(this, true)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="action-btn" title="Thumbs down" onclick="rateResponse(this, false)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h3a2 2 0 012 2v7a2 2 0 01-2 2h-3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="action-btn" title="Read aloud" onclick="readAloud(this, '${text.replace(/'/g, "\\'")}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 6v12M8 9v6M16 9v6M4 10v4M20 10v4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="action-btn" title="Regenerate response" onclick="regenerateResponse(this)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 12c0-4.4 3.6-8 8-8 3.4 0 6.3 2.1 7.4 5M22 12c0 4.4-3.6 8-8 8-3.4 0-6.3-2.1-7.4-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            `;
        }
        
        messageGroup.innerHTML = `
            <div class="sender-label">${sender}</div>
            <div class="message-content">
                ${text}
            </div>
            ${actionButtons}
        `;
        
        messagesContainer.appendChild(messageGroup);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function showTypingIndicator() {
        const messagesContainer = document.querySelector('.messages-container');
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message-group appy typing-indicator';
        typingIndicator.innerHTML = `
            <div class="sender-label">appy</div>
            <div class="message-content">
                <p>thinking.</p>
            </div>
        `;
        messagesContainer.appendChild(typingIndicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function removeTypingIndicator() {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // Modify getGeminiResponse to use chat-specific memory
    async function getGeminiResponse(message) {
        const API_KEY = 'AIzaSyBuX60NBbPLymigAL9rBSG2V-Mu0GSyPAM';
        const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

        // Get memory specific to current chat
        const chatMemory = getCurrentChatMemory();
        const userContext = chatMemory.name ? 
            `The user's name is ${chatMemory.name}. Remember this information for this chat session only.` : '';

        // Enhanced context that includes comprehensive knowledge domains
        const contextPrompt = `You are appy, a friendly and highly knowledgeable AI assistant with expertise across multiple domains. ${userContext}

You have extensive knowledge in:
1. Science & Technology
   - Physics, Chemistry, Biology
   - Computer Science & Programming
   - Space & Astronomy
   - Environmental Science
   - Latest Tech Trends

2. Arts & Humanities
   - Literature & Languages
   - History & Civilization
   - Philosophy & Ethics
   - Visual Arts & Music
   - Cultural Studies

3. Social Sciences
   - Psychology & Behavior
   - Sociology & Society
   - Economics & Finance
   - Politics & Government
   - Education & Learning

4. Health & Wellness
   - Medicine & Healthcare
   - Mental Health
   - Nutrition & Diet
   - Fitness & Exercise
   - Lifestyle & Well-being

5. Practical Knowledge
   - DIY & Home Improvement
   - Cooking & Food
   - Personal Finance
   - Career Development
   - Life Skills & Advice

When interacting with users:
- Remember and use their name if known
- Maintain context from previous interactions
- Be personable and friendly
- Provide accurate, up-to-date information
- Explain complex topics in simple terms
- Offer practical, actionable advice
- Support answers with relevant examples
- Acknowledge when information might be uncertain
- Stay within ethical boundaries

Current user message: ${message}`;

        try {
            const response = await fetch(`${API_URL}?key=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: contextPrompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                let responseText = data.candidates[0].content.parts[0].text;
                
                // Update user memory based on the conversation
                updateUserMemory(message, responseText);
                
                // Format code blocks with proper syntax highlighting
                responseText = responseText.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
                    return `<pre><code class="${lang || ''}">${code.trim()}</code></pre>`;
                });
                
                return responseText;
            } else {
                throw new Error('Invalid response format from Gemini API');
            }
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            throw error;
        }
    }

    // Action button functions
    window.copyText = (text) => {
        navigator.clipboard.writeText(text);
        // Optional: Show a toast notification
    };

    window.rateResponse = (button, isPositive) => {
        // Remove active class from all rating buttons in this group
        const actionGroup = button.closest('.message-actions');
        actionGroup.querySelectorAll('.action-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        // Here you could send the rating to your backend
    };

    let currentUtterance = null;
    window.readAloud = (button, text) => {
        if (currentUtterance) {
            window.speechSynthesis.cancel();
            currentUtterance = null;
            button.classList.remove('active');
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Get available voices and set a better voice
        const voices = window.speechSynthesis.getVoices();
        // Try to find a good English voice, preferably Microsoft
        const preferredVoice = voices.find(voice => 
            voice.name.includes('Microsoft') && voice.name.includes('Zira') ||
            voice.name.includes('Google') && voice.name.includes('US English') ||
            voice.lang === 'en-US'
        ) || voices[0];
        
        utterance.voice = preferredVoice;
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onend = () => {
            button.classList.remove('active');
            currentUtterance = null;
        };
        
        button.classList.add('active');
        currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
    };

    window.regenerateResponse = async (button) => {
        const messageGroup = button.closest('.message-group');
        const userMessage = messageGroup.previousElementSibling.querySelector('p').textContent;
        
        // Remove the current response
        messageGroup.remove();
        
        // Show typing indicator
        showTypingIndicator();
        
        try {
            // Get new response
            const response = await getGeminiResponse(userMessage);
            removeTypingIndicator();
            addMessageToChat('appy', response);
        } catch (error) {
            console.error('Error:', error);
            removeTypingIndicator();
            addMessageToChat('appy', 'Sorry, I encountered an error while regenerating the response.');
        }
    };

    // Modify deleteChat to properly clear memory
    function deleteChat(chatItem) {
        try {
            const chatData = JSON.parse(chatItem.dataset.chat);
            
            // Remove from localStorage
            let savedChats = JSON.parse(localStorage.getItem('savedChats') || '[]');
            savedChats = savedChats.filter(chat => 
                chat.timestamp !== chatData.timestamp && 
                chat.title !== chatData.title
            );
            localStorage.setItem('savedChats', JSON.stringify(savedChats));
            
            // Find and remove the li element
            const listItem = chatItem.closest('li');
            if (listItem) {
                listItem.remove();
            }
            
            // Clear messages and memory if this was the active chat
            if (chatItem.classList.contains('active')) {
                document.querySelector('.messages-container').innerHTML = '';
                currentChatId = 'default-chat';
                localStorage.setItem('currentChatId', currentChatId);
                localStorage.removeItem(`memory-${chatData.timestamp}`);
                localStorage.removeItem(`chat-${chatData.timestamp}`);
            }
            
            // Remove all associated data
            localStorage.removeItem(`memory-${chatData.timestamp}`);
            localStorage.removeItem(`chat-${chatData.timestamp}`);
            
            // Update visibility
            const chatList = document.querySelector('.chat-list');
            const noChatsMessage = document.querySelector('.no-chats-message');
            
            const hasChats = chatList.children.length > 0;
            chatList.style.display = hasChats ? 'flex' : 'none';
            noChatsMessage.style.display = hasChats ? 'none' : 'flex';
            chatList.classList.toggle('has-chats', hasChats);
            
            // Force DOM update
            chatList.style.display = 'none';
            chatList.offsetHeight; // Force reflow
            chatList.style.display = hasChats ? 'flex' : 'none';
        } catch (error) {
            console.error('Error deleting chat:', error);
        }
    }

    // Handle file attachment
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,.pdf,.doc,.docx,.txt';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    let currentAttachment = null;
    let attachmentPreview = null;

    const attachButton = document.querySelector('.tool-button[title="Attach files"]');
    attachButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        currentAttachment = file;
        
        // Create preview container if it doesn't exist
        if (!attachmentPreview) {
            attachmentPreview = document.createElement('div');
            attachmentPreview.className = 'attachment-preview';
            const inputField = document.querySelector('.input-field');
            inputField.insertBefore(attachmentPreview, inputField.firstChild);
        }

        // Show preview of the attachment
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => {
                attachmentPreview.innerHTML = `
                    <div class="preview-item">
                        <img src="${reader.result}" alt="${file.name}" style="max-height: 100px;">
                        <button class="remove-attachment" onclick="removeAttachment()">×</button>
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        } else {
            attachmentPreview.innerHTML = `
                <div class="preview-item">
                    <div class="document-preview">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" stroke-width="2"/>
                            <polyline points="13 2 13 9 20 9"/>
                        </svg>
                        <span>${file.name}</span>
                    </div>
                    <button class="remove-attachment" onclick="removeAttachment()">×</button>
                </div>
            `;
        }

        // Clear the file input
        fileInput.value = '';
    });

    window.removeAttachment = () => {
        currentAttachment = null;
        if (attachmentPreview) {
            attachmentPreview.remove();
            attachmentPreview = null;
        }
    };

    function handleImageAttachment(file, messageText) {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const { width, height } = calculateImageDimensions(img, 800, 600);
                const imageMessage = `
                    <div class="attachment-container">
                        <img src="${img.src}" alt="${file.name}" style="max-width: ${width}px; max-height: ${height}px;">
                        ${messageText ? `<p class="attachment-message">${messageText}</p>` : ''}
                    </div>
                `;
                addMessageToChat('user', imageMessage);
                saveMessageToMemory('user', messageText || '', 'image', {
                    src: img.src,
                    name: file.name,
                    width,
                    height
                });
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    }

    function handleDocumentAttachment(file, messageText) {
        const documentMessage = `
            <div class="attachment-container">
                <div class="document-attachment">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" stroke-width="2"/>
                        <polyline points="13 2 13 9 20 9"/>
                    </svg>
                    <span>${file.name}</span>
                </div>
                ${messageText ? `<p class="attachment-message">${messageText}</p>` : ''}
            </div>
        `;
        addMessageToChat('user', documentMessage);
        saveMessageToMemory('user', messageText || '', 'document', file.name);
    }

    function calculateImageDimensions(img, maxWidth, maxHeight) {
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
            height = (maxWidth * height) / width;
            width = maxWidth;
        }
        if (height > maxHeight) {
            width = (maxHeight * width) / height;
            height = maxHeight;
        }
        
        return { width, height };
    }

    function createAttachmentMessage(attachmentHtml, messageText) {
        return `
            <div class="attachment-container">
                ${attachmentHtml}
                ${messageText ? `<p class="attachment-message">${messageText}</p>` : ''}
            </div>
        `;
    }

    // Modify startNewChat to handle memory properly
    window.startNewChat = () => {
        // Clear old chat memory
        localStorage.removeItem(`memory-${currentChatId}`);
        
        // Set new chat ID
        currentChatId = Date.now().toString();
        localStorage.setItem('currentChatId', currentChatId);
        
        // Clear messages
        document.querySelector('.messages-container').innerHTML = '';
        
        // Remove active state from all chats
        document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    };

    // Add click handler for new chat button
    document.querySelector('.new-chat-btn').addEventListener('click', startNewChat);

    // Add function to clear user memory
    window.clearUserMemory = () => {
        userMemory = {};
        localStorage.removeItem('userMemory');
    };

    // Add click handler for new chat button
    document.querySelector('.new-chat-btn').addEventListener('click', startNewChat);
});

function initStarBackground() {
    const canvas = document.getElementById('starCanvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size to window size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // Initial resize
    resizeCanvas();

    // Resize canvas when window is resized
    window.addEventListener('resize', resizeCanvas);

    // Star class
    class Star {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2;
            this.speed = Math.random() * 0.5 + 0.1;
            this.brightness = Math.random();
            this.maxBrightness = Math.random() * 0.8 + 0.2;
            this.direction = Math.random() > 0.5 ? 0.02 : -0.02;
        }

        update() {
            // Move star
            this.y += this.speed;
            
            // Twinkle effect
            this.brightness += this.direction;
            
            if (this.brightness <= 0 || this.brightness >= this.maxBrightness) {
                this.direction *= -1;
            }

            // Reset if star goes off screen
            if (this.y > canvas.height) {
                this.y = 0;
                this.x = Math.random() * canvas.width;
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`;
            ctx.fill();
        }
    }

    // Create stars
    const stars = [];
    const numStars = Math.floor((canvas.width * canvas.height) / 5000); // Reduced density
    
    for (let i = 0; i < numStars; i++) {
        stars.push(new Star());
    }

    // Animation loop
    function animate() {
        ctx.fillStyle = '#0b0a0b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        stars.forEach(star => {
            star.update();
            star.draw();
        });

        requestAnimationFrame(animate);
    }

    animate();
} 