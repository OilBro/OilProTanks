import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  AlertCircle, 
  BookOpen,
  Calculator,
  CheckCircle,
  X,
  Minimize2,
  Maximize2,
  HelpCircle
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AiAssistantProps {
  reportId?: number;
  context?: {
    section?: string;
    component?: string;
    currentMeasurement?: any;
    tankDetails?: any;
  };
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    section?: string;
    api653Reference?: string;
    calculationType?: string;
    warningLevel?: 'info' | 'warning' | 'critical';
  };
}

interface GuidanceItem {
  id: number;
  category: string;
  title: string;
  content: string;
  api653References?: string[];
  warningThresholds?: any;
}

export function AiAssistant({ reportId, context }: AiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Query for guidance templates
  const { data: guidanceTemplates } = useQuery({
    queryKey: ['/api/ai/guidance-templates', context?.section],
    enabled: isOpen
  });

  // Query for conversation history
  const { data: conversationHistory } = useQuery({
    queryKey: ['/api/ai/conversations', reportId, sessionId],
    enabled: isOpen && !!reportId
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest('/api/ai/chat', {
        method: 'POST',
        body: {
          message,
          reportId,
          sessionId,
          context,
          conversationHistory: messages
        }
      });
    },
    onSuccess: (response) => {
      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        metadata: response.metadata
      };
      setMessages(prev => [...prev, assistantMessage]);
      scrollToBottom();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to get AI response',
        variant: 'destructive'
      });
    }
  });

  // Save conversation mutation
  const saveConversationMutation = useMutation({
    mutationFn: async () => {
      if (!reportId) return;
      return apiRequest('/api/ai/conversations', {
        method: 'POST',
        body: {
          reportId,
          sessionId,
          context: context?.section,
          messages
        }
      });
    }
  });

  useEffect(() => {
    if (conversationHistory?.messages) {
      setMessages(conversationHistory.messages);
    }
  }, [conversationHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Auto-save conversation every 30 seconds if there are messages
    if (messages.length > 0) {
      const interval = setInterval(() => {
        saveConversationMutation.mutate();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      metadata: {
        section: context?.section
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    sendMessageMutation.mutate(input);
  };

  const handleQuickAction = (action: string) => {
    let question = '';
    switch (action) {
      case 'thickness':
        question = 'What is the minimum acceptable thickness for this component according to API 653?';
        break;
      case 'corrosion':
        question = 'How do I calculate the corrosion rate and what rate is considered critical?';
        break;
      case 'settlement':
        question = 'What are the API 653 settlement criteria and how do I perform a cosine fit analysis?';
        break;
      case 'inspection':
        question = 'What inspection methods should I use for this tank section?';
        break;
      case 'safety':
        question = 'What safety considerations should I be aware of for this inspection?';
        break;
      default:
        return;
    }
    setInput(question);
    handleSendMessage();
  };

  const getMessageIcon = (role: string) => {
    return role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />;
  };

  const getWarningBadge = (level?: string) => {
    if (!level) return null;
    const colors = {
      info: 'bg-blue-100 text-blue-800',
      warning: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800'
    };
    return (
      <Badge className={colors[level as keyof typeof colors]}>
        {level.toUpperCase()}
      </Badge>
    );
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg z-50"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 shadow-xl z-50">
        <CardHeader className="flex flex-row items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">AI Inspector Assistant</h3>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(false)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[600px] shadow-xl z-50 flex flex-col">
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">AI Inspector Assistant</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                saveConversationMutation.mutate();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {context?.section && (
          <Badge variant="outline" className="mt-2">
            Context: {context.section}
          </Badge>
        )}
      </CardHeader>

      <Tabs defaultValue="chat" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="guidance">Quick Guidance</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Bot className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">Hi! I'm your AI inspection assistant.</p>
                <p className="text-sm mt-2">Ask me about API 653 standards, calculations, or inspection procedures.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`flex gap-2 max-w-[85%] ${
                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                          message.role === 'user'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {getMessageIcon(message.role)}
                      </div>
                      <div>
                        <div
                          className={`rounded-lg px-3 py-2 ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                        {message.metadata && (
                          <div className="mt-1 flex gap-2 flex-wrap">
                            {message.metadata.warningLevel && getWarningBadge(message.metadata.warningLevel)}
                            {message.metadata.api653Reference && (
                              <Badge variant="outline" className="text-xs">
                                <BookOpen className="h-3 w-3 mr-1" />
                                {message.metadata.api653Reference}
                              </Badge>
                            )}
                            {message.metadata.calculationType && (
                              <Badge variant="outline" className="text-xs">
                                <Calculator className="h-3 w-3 mr-1" />
                                {message.metadata.calculationType}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {sendMessageMutation.isPending && (
                  <div className="flex gap-3">
                    <div className="flex gap-2">
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-gray-600 animate-pulse" />
                      </div>
                      <div className="bg-gray-100 rounded-lg px-3 py-2">
                        <p className="text-sm text-gray-600">Thinking...</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('thickness')}
              >
                Thickness
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('corrosion')}
              >
                Corrosion
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('settlement')}
              >
                Settlement
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about API 653 standards..."
                disabled={sendMessageMutation.isPending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || sendMessageMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="guidance" className="flex-1 p-4">
          <ScrollArea className="h-full">
            <div className="space-y-3">
              {guidanceTemplates?.map((item: GuidanceItem) => (
                <Card key={item.id} className="cursor-pointer hover:bg-gray-50">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">{item.content}</p>
                        {item.api653References && item.api653References.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {item.api653References.map((ref) => (
                              <Badge key={ref} variant="outline" className="text-xs">
                                {ref}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
}