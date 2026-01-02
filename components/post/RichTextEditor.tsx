'use client'

import { useEffect, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { createClient } from '@/lib/supabase/client'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  minHeight?: string
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = '내용을 입력하세요',
  minHeight = '200px',
}: RichTextEditorProps) {
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // 이모지 피커 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: false, // Link extension을 별도로 추가하므로 비활성화
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            width: {
              default: null,
              renderHTML: attributes => {
                if (!attributes.width) {
                  return {}
                }
                return {
                  width: attributes.width,
                  style: `width: ${attributes.width}px; height: auto;`,
                }
              },
              parseHTML: element => {
                const width = element.getAttribute('width') || element.style.width
                return width ? parseInt(width, 10) : null
              },
            },
            height: {
              default: null,
              renderHTML: attributes => {
                if (!attributes.height) {
                  return {}
                }
                return {
                  height: attributes.height,
                  style: `height: ${attributes.height}px; width: auto;`,
                }
              },
              parseHTML: element => {
                const height = element.getAttribute('height') || element.style.height
                return height ? parseInt(height, 10) : null
              },
            },
          }
        },
      }).configure({
        inline: true,
        allowBase64: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-ok-primary underline hover:text-ok-dark',
        },
      }),
    ],
    content: content || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      try {
        onChange(editor.getHTML())
      } catch (err) {
        console.error('에디터 업데이트 오류:', err)
        setError('에디터 업데이트 중 오류가 발생했습니다.')
      }
    },
    editorProps: {
      attributes: {
        class: 'ProseMirror focus:outline-none',
      },
    },
    onError: ({ editor, error }) => {
      console.error('TipTap 에디터 오류:', error)
      setError('에디터 초기화 중 오류가 발생했습니다.')
    },
  })

  // content가 변경되면 에디터 업데이트 (외부에서 content가 변경된 경우만)
  useEffect(() => {
    if (editor && mounted) {
      try {
        const currentContent = editor.getHTML()
        if (content !== currentContent) {
          editor.commands.setContent(content || '', false)
        }
      } catch (err) {
        console.error('에디터 content 업데이트 오류:', err)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, mounted])

  // 이미지 리사이즈 기능 추가
  useEffect(() => {
    if (!editor || !mounted) return

    let resizeHandle: HTMLDivElement | null = null
    let selectedImg: HTMLImageElement | null = null
    let contextMenu: HTMLDivElement | null = null
    let isResizing = false
    let startX = 0
    let startWidth = 0
    let startHeight = 0

    const removeResizeHandle = () => {
      if (resizeHandle) {
        resizeHandle.remove()
        resizeHandle = null
      }
      if (selectedImg) {
        selectedImg.style.outline = ''
        selectedImg.style.outlineOffset = ''
        selectedImg = null
      }
    }

    const removeContextMenu = () => {
      if (contextMenu) {
        contextMenu.remove()
        contextMenu = null
      }
    }

    const updateResizeHandlePosition = () => {
      if (!resizeHandle || !selectedImg) return
      
      const imgRect = selectedImg.getBoundingClientRect()
      const editorContainer = editor.view.dom
      const containerRect = editorContainer.getBoundingClientRect()
      
      resizeHandle.style.left = `${imgRect.right - containerRect.left - 8}px`
      resizeHandle.style.top = `${imgRect.bottom - containerRect.top - 8}px`
    }

    const createResizeHandle = (img: HTMLImageElement) => {
      removeResizeHandle()
      removeContextMenu()
      
      selectedImg = img
      img.style.outline = '2px solid #FF6600'
      img.style.outlineOffset = '2px'
      
      // 이미지가 이미 wrapper 안에 있는지 확인
      let wrapper = img.parentElement
      if (!wrapper || !wrapper.classList.contains('image-resize-wrapper')) {
        // wrapper 생성
        wrapper = document.createElement('div')
        wrapper.className = 'image-resize-wrapper'
        wrapper.style.position = 'relative'
        wrapper.style.display = 'inline-block'
        wrapper.style.maxWidth = '100%'
        wrapper.style.margin = '1em 0'
        
        // 이미지의 부모 노드에 wrapper 삽입
        const parent = img.parentNode
        if (!parent) {
          return
        }
        
        parent.insertBefore(wrapper, img)
        wrapper.appendChild(img)
      }
      
      // 리사이즈 핸들 생성
      const handle = document.createElement('div')
      handle.className = 'resize-handle'
      handle.innerHTML = '' // 빈 내용
      
      // 인라인 스타일로 확실하게 설정
      handle.style.cssText = `
        position: absolute;
        width: 24px;
        height: 24px;
        background: #FF6600;
        border: 3px solid white;
        border-radius: 50%;
        cursor: nwse-resize;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        right: -12px;
        bottom: -12px;
        display: block;
        visibility: visible;
        opacity: 1;
        pointer-events: auto;
      `
      
      wrapper.appendChild(handle)
      resizeHandle = handle

      const startResize = (e: MouseEvent) => {
        isResizing = true
        startX = e.clientX
        startWidth = img.offsetWidth
        startHeight = img.offsetHeight
        e.preventDefault()
        e.stopPropagation()
      }

      const doResize = (e: MouseEvent) => {
        if (!isResizing || !selectedImg) return
        
        const deltaX = e.clientX - startX
        const newWidth = Math.max(50, Math.min(startWidth + deltaX, 1200))
        const aspectRatio = startHeight / startWidth
        const newHeight = newWidth * aspectRatio
        
        selectedImg.style.width = `${newWidth}px`
        selectedImg.style.height = `${newHeight}px`
        selectedImg.setAttribute('width', newWidth.toString())
        selectedImg.setAttribute('height', newHeight.toString())
      }

      const stopResize = () => {
        if (isResizing) {
          isResizing = false
          if (selectedImg) {
            const html = editor.getHTML()
            onChange(html)
          }
        }
      }

      handle.addEventListener('mousedown', startResize)
      document.addEventListener('mousemove', doResize)
      document.addEventListener('mouseup', stopResize)
    }

    const showContextMenu = (event: MouseEvent, img: HTMLImageElement) => {
      event.preventDefault()
      removeContextMenu()
      
      const menu = document.createElement('div')
      menu.className = 'image-context-menu'
      menu.style.position = 'fixed'
      menu.style.left = `${event.clientX}px`
      menu.style.top = `${event.clientY}px`
      menu.style.background = 'white'
      menu.style.border = '1px solid #e5e7eb'
      menu.style.borderRadius = '8px'
      menu.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
      menu.style.zIndex = '10000'
      menu.style.padding = '4px'
      menu.style.minWidth = '150px'
      
      const menuItem = document.createElement('div')
      menuItem.textContent = '사이즈 조절하기'
      menuItem.style.padding = '8px 12px'
      menuItem.style.cursor = 'pointer'
      menuItem.style.borderRadius = '4px'
      menuItem.style.fontSize = '14px'
      menuItem.style.color = '#374151'
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.background = '#f3f4f6'
      })
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.background = 'transparent'
      })
      menuItem.addEventListener('click', () => {
        createResizeHandle(img)
        removeContextMenu()
      })
      
      menu.appendChild(menuItem)
      document.body.appendChild(menu)
      contextMenu = menu

      // 다른 곳 클릭 시 메뉴 제거
      const closeMenu = (e: MouseEvent) => {
        if (!menu.contains(e.target as Node)) {
          removeContextMenu()
          document.removeEventListener('click', closeMenu)
        }
      }
      setTimeout(() => {
        document.addEventListener('click', closeMenu)
      }, 0)
    }

    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      if (target.tagName === 'IMG') {
        showContextMenu(event, target as HTMLImageElement)
      }
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      if (!target.closest('.resize-handle') && target.tagName !== 'IMG' && !target.closest('.image-context-menu')) {
        removeResizeHandle()
      }
    }

    const editorElement = editor.view.dom
    editorElement.addEventListener('contextmenu', handleContextMenu)
    editorElement.addEventListener('click', handleClick)

    return () => {
      editorElement.removeEventListener('contextmenu', handleContextMenu)
      editorElement.removeEventListener('click', handleClick)
      removeResizeHandle()
      removeContextMenu()
    }
  }, [editor, mounted, onChange])

  if (!mounted) {
    return (
      <div className="border-2 border-gray-200 rounded-xl overflow-hidden" style={{ minHeight }}>
        <div className="flex items-center justify-center p-8 text-gray-500">
          에디터 로딩 중...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border-2 border-red-200 rounded-xl overflow-hidden bg-red-50" style={{ minHeight }}>
        <div className="flex flex-col items-center justify-center p-8 text-red-600">
          <p className="mb-2 font-semibold">에디터 오류</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => {
              setError(null)
              window.location.reload()
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>
    )
  }

  if (!editor) {
    return (
      <div className="border-2 border-gray-200 rounded-xl overflow-hidden" style={{ minHeight }}>
        <div className="flex items-center justify-center p-8 text-gray-500">
          에디터 로딩 중...
        </div>
      </div>
    )
  }

  return (
    <div className="border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-ok-primary focus-within:ring-2 focus-within:ring-ok-primary/20 transition-colors">
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border-b border-gray-200">
        {/* 텍스트 스타일 - 굵게 */}
        <button
          type="button"
          onClick={() => {
            try {
              editor.chain().focus().toggleBold().run()
            } catch (err) {
              console.error('Bold 토글 오류:', err)
            }
          }}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bold') ? 'bg-ok-primary/20 text-ok-primary' : ''
          }`}
          title="굵게 (Ctrl+B)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
          </svg>
        </button>

        {/* 텍스트 스타일 - 기울임 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('italic') ? 'bg-ok-primary/20 text-ok-primary' : ''
          }`}
          title="기울임 (Ctrl+I)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 4h6M8 12h8M6 20h8" />
          </svg>
        </button>

        {/* 텍스트 스타일 - 취소선 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('strike') ? 'bg-ok-primary/20 text-ok-primary' : ''
          }`}
          title="취소선"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12h12" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        {/* 구분선 */}
        <div className="w-px h-6 bg-gray-300"></div>

        {/* 제목 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('heading', { level: 1 }) ? 'bg-ok-primary/20 text-ok-primary' : ''
          }`}
          title="제목 1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('heading', { level: 2 }) ? 'bg-ok-primary/20 text-ok-primary' : ''
          }`}
          title="제목 2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h10" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('heading', { level: 3 }) ? 'bg-ok-primary/20 text-ok-primary' : ''
          }`}
          title="제목 3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>

        {/* 구분선 */}
        <div className="w-px h-6 bg-gray-300"></div>

        {/* 리스트 - 글머리 기호 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bulletList') ? 'bg-ok-primary/20 text-ok-primary' : ''
          }`}
          title="글머리 기호 목록"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="5" cy="6" r="2" />
            <circle cx="5" cy="12" r="2" />
            <circle cx="5" cy="18" r="2" />
            <path d="M10 6h12M10 12h12M10 18h12" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
          </svg>
        </button>

        {/* 리스트 - 번호 매기기 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('orderedList') ? 'bg-ok-primary/20 text-ok-primary' : ''
          }`}
          title="번호 매기기 목록"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h1v1H4V6zm0 6h1v1H4v-1zm0 6h1v1H4v-1zm3-12h12M7 12h12M7 18h12" />
            <text x="2" y="9" fontSize="10" fill="currentColor" fontWeight="bold">1</text>
            <text x="2" y="15" fontSize="10" fill="currentColor" fontWeight="bold">2</text>
            <text x="2" y="21" fontSize="10" fill="currentColor" fontWeight="bold">3</text>
          </svg>
        </button>

        {/* 구분선 */}
        <div className="w-px h-6 bg-gray-300"></div>

        {/* 인용구 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('blockquote') ? 'bg-ok-primary/20 text-ok-primary' : ''
          }`}
          title="인용구"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>

        {/* 코드 - 인라인 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('code') ? 'bg-ok-primary/20 text-ok-primary' : ''
          }`}
          title="인라인 코드"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>

        {/* 코드 블록 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('codeBlock') ? 'bg-ok-primary/20 text-ok-primary' : ''
          }`}
          title="코드 블록"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {/* 구분선 */}
        <div className="w-px h-6 bg-gray-300"></div>

        {/* 링크 */}
        <button
          type="button"
          onClick={() => {
            const { from, to } = editor.state.selection
            const selectedText = editor.state.doc.textBetween(from, to, ' ')
            if (selectedText) {
              setLinkText(selectedText)
            } else {
              setLinkText('')
            }
            setLinkUrl('')
            setShowLinkDialog(true)
          }}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('link') ? 'bg-ok-primary/20 text-ok-primary' : ''
          }`}
          title="링크 삽입"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>

        {/* 이모지 */}
        <div className="relative" ref={emojiPickerRef}>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 rounded hover:bg-gray-200 transition-colors"
            title="이모지 삽입"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {showEmojiPicker && (
            <div className="absolute top-full left-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl z-50 w-80 max-h-96 overflow-hidden">
              <EmojiPicker onEmojiSelect={(emoji) => {
                editor.chain().focus().insertContent(emoji).run()
                setShowEmojiPicker(false)
              }} />
            </div>
          )}
        </div>

        {/* 구분선 */}
        <div className="w-px h-6 bg-gray-300"></div>

        {/* 이미지 업로드 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={async (e) => {
            const files = e.target.files
            if (!files || files.length === 0 || !editor) return

            setUploading(true)

            const supabase = createClient()

            // 현재 사용자 확인
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
              alert('로그인이 필요합니다.')
              setUploading(false)
              return
            }

            for (const file of Array.from(files)) {
              if (!file.type.startsWith('image/')) {
                alert(`${file.name}은(는) 이미지 파일이 아닙니다.`)
                continue
              }

              // 파일 크기 제한 (5MB)
              if (file.size > 5 * 1024 * 1024) {
                alert(`${file.name}은(는) 5MB 이하여야 합니다.`)
                continue
              }

              try {
                const fileExt = file.name.split('.').pop()
                const fileName = `${user.id}/${Date.now()}.${fileExt}`

                // 클라이언트에서 직접 Supabase Storage에 업로드
                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('post-images')
                  .upload(fileName, file, {
                    contentType: file.type,
                    upsert: false,
                  })

                if (uploadError) {
                  console.error('Storage upload error:', uploadError)
                  throw new Error(uploadError.message || '업로드 실패')
                }

                // 공개 URL 가져오기
                const { data: { publicUrl } } = supabase.storage
                  .from('post-images')
                  .getPublicUrl(uploadData.path)

                if (!publicUrl) {
                  throw new Error('이미지 URL을 받지 못했습니다.')
                }

                // 에디터에 이미지 삽입
                editor.chain().focus().setImage({ src: publicUrl }).run()
              } catch (error) {
                console.error('이미지 업로드 오류:', error)
                const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
                alert(`${file.name} 업로드에 실패했습니다: ${errorMessage}`)
              }
            }

            setUploading(false)
            // 파일 입력 초기화
            if (fileInputRef.current) {
              fileInputRef.current.value = ''
            }
          }}
          className="hidden"
          disabled={uploading}
        />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="이미지 삽입"
          >
            {uploading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          {uploading && <span className="text-sm text-gray-500 ml-2">업로드 중...</span>}
      </div>

      {/* 에디터 영역 */}
      <div style={{ minHeight }} className="bg-white">
        <EditorContent editor={editor} />
      </div>

      {/* 링크 다이얼로그 */}
      {showLinkDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">링크 추가</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  링크 URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  링크 텍스트 (선택사항)
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="링크 텍스트"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ok-primary focus:ring-2 focus:ring-ok-primary/20 transition-colors"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowLinkDialog(false)
                  setLinkUrl('')
                  setLinkText('')
                }}
                className="px-4 py-2 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (linkUrl) {
                    if (linkText) {
                      editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkText}</a>`).run()
                    } else {
                      editor.chain().focus().setLink({ href: linkUrl }).run()
                    }
                  }
                  setShowLinkDialog(false)
                  setLinkUrl('')
                  setLinkText('')
                }}
                className="px-4 py-2 bg-ok-primary text-white rounded-xl hover:bg-ok-dark font-semibold transition-colors shadow-md"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 이모지 피커 컴포넌트
function EmojiPicker({ onEmojiSelect }: { onEmojiSelect: (emoji: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('smileys')

  // 인기 이모지
  const frequentlyUsed = ['👍', '😊', '😉', '😍', '😋', '😜', '😅', '😭', '😱']

  // 이모지 카테고리
  const emojiCategories = {
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿', '🦔'],
    food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🌽', '🥕', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕️', '🍵', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧃', '🧉', '🧊', '🥢', '🍽', '🍴', '🥄'],
    activities: ['⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🥍', '🏏', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸', '🥌', '🎿', '⛷', '🏂', '🏋️‍♀️', '🏋️', '🤼‍♀️', '🤼‍♂️', '🤸‍♀️', '🤸‍♂️', '⛹️‍♀️', '⛹️', '🤺', '🤾‍♀️', '🤾‍♂️', '🏌️‍♀️', '🏌️', '🏇', '🧘‍♀️', '🧘‍♂️', '🏄‍♀️', '🏄', '🏊‍♀️', '🏊', '🤽‍♀️', '🤽‍♂️', '🚣‍♀️', '🚣', '🧗‍♀️', '🧗‍♂️', '🚵‍♀️', '🚵', '🚴‍♀️', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🏵', '🎗', '🎫', '🎟', '🎪', '🤹‍♀️', '🤹‍♂️', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟', '🎯', '🎳', '🎮', '🎰', '🧩'],
    objects: ['⌚️', '📱', '📲', '💻', '⌨️', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽', '🎞', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙', '🎚', '🎛', '⏱', '⏲', '⏰', '🕰', '⌛️', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯', '🧯', '🛢', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒', '🛠', '⛏', '🔩', '⚙️', '🧱', '⛓', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡', '⚔️', '🛡', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳', '💊', '💉', '🧬', '🦠', '🧫', '🧪', '🌡', '🧹', '🧺', '🧻', '🚽', '🚿', '🛁', '🛀', '🧼', '🪒', '🧽', '🧴', '🛎', '🔑', '🗝', '🚪', '🪑', '🛋', '🛏', '🛌', '🧸', '🪆', '🖼', '🪞', '🪟', '🛍', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🪆', '🧧', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷', '🪧', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒', '🗓', '📆', '📅', '🗑', '📇', '🗃', '🗳', '🗄', '📋', '📁', '📂', '🗂', '🗞', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊', '🖋', '✒️', '🖌', '🖍', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓'],
    symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈️', '♉️', '♊️', '♋️', '♌️', '♍️', '♎️', '♏️', '♐️', '♑️', '♒️', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚️', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕️', '🛑', '⛔️', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗️', '❓', '❕', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯️', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿️', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸', '⏯', '⏹', '⏺', '⏭', '⏮', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔜', '🔝', '✔️', '☑️', '🔘', '⚪️', '⚫️', '🔴', '🔵', '🟠', '🟡', '🟢', '🟣', '🟤', '⬛️', '⬜️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔳', '🔲'],
  }

  const filteredEmojis = searchTerm
    ? Object.values(emojiCategories).flat().filter(emoji => emoji.includes(searchTerm))
    : emojiCategories[selectedCategory as keyof typeof emojiCategories] || []

  return (
    <div className="flex flex-col h-full max-h-96">
      {/* 검색 바 */}
      <div className="p-3 border-b border-gray-200">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="이모지 검색..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-ok-primary"
        />
      </div>

      {/* 카테고리 탭 */}
      {!searchTerm && (
        <div className="flex gap-1 p-2 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('smileys')}
            className={`p-2 rounded ${selectedCategory === 'smileys' ? 'bg-ok-primary/20' : ''}`}
            title="스마일리"
          >
            😀
          </button>
          <button
            onClick={() => setSelectedCategory('animals')}
            className={`p-2 rounded ${selectedCategory === 'animals' ? 'bg-ok-primary/20' : ''}`}
            title="동물"
          >
            🐶
          </button>
          <button
            onClick={() => setSelectedCategory('food')}
            className={`p-2 rounded ${selectedCategory === 'food' ? 'bg-ok-primary/20' : ''}`}
            title="음식"
          >
            🍎
          </button>
          <button
            onClick={() => setSelectedCategory('activities')}
            className={`p-2 rounded ${selectedCategory === 'activities' ? 'bg-ok-primary/20' : ''}`}
            title="활동"
          >
            ⚽️
          </button>
          <button
            onClick={() => setSelectedCategory('objects')}
            className={`p-2 rounded ${selectedCategory === 'objects' ? 'bg-ok-primary/20' : ''}`}
            title="물건"
          >
            ⌚️
          </button>
          <button
            onClick={() => setSelectedCategory('symbols')}
            className={`p-2 rounded ${selectedCategory === 'symbols' ? 'bg-ok-primary/20' : ''}`}
            title="기호"
          >
            ❤️
          </button>
        </div>
      )}

      {/* 이모지 그리드 */}
      <div className="flex-1 overflow-y-auto p-3">
        {!searchTerm && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">자주 사용하는 이모지</h4>
            <div className="grid grid-cols-9 gap-1">
              {frequentlyUsed.map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => onEmojiSelect(emoji)}
                  className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          {!searchTerm && (
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              {selectedCategory === 'smileys' && '스마일리 & 사람'}
              {selectedCategory === 'animals' && '동물 & 자연'}
              {selectedCategory === 'food' && '음식 & 음료'}
              {selectedCategory === 'activities' && '활동'}
              {selectedCategory === 'objects' && '물건'}
              {selectedCategory === 'symbols' && '기호'}
            </h4>
          )}
          <div className="grid grid-cols-9 gap-1">
            {filteredEmojis.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => onEmojiSelect(emoji)}
                className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
