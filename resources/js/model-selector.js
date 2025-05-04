/**
 * 모델 선택 컴포넌트
 * 
 * 채팅 인터페이스에서 사용할 모델을 선택하는 커스텀 드롭다운 컴포넌트입니다.
 */
class ModelSelector {
  constructor(containerId, options = {}) {
    // 디버깅 메시지
    console.log('ModelSelector 초기화 시작:', containerId);
    console.log('제공된 옵션:', JSON.stringify(options));
    
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`모델 선택기 컨테이너를 찾을 수 없습니다: ${containerId}`);
      // 디버깅: 현재 DOM에 있는 모든 요소의 ID 출력
      console.log('현재 DOM의 모든 요소 ID:');
      document.querySelectorAll('[id]').forEach(el => console.log(el.id));
      return;
    }
    
    this.options = {
      onChange: () => {},
      models: [],
      defaultModelId: null,
      ...options
    };
    
    this.selectedModelId = this.options.defaultModelId;
    console.log('선택된 기본 모델 ID:', this.selectedModelId);
    
    this.render();
    this.bindEvents();
    console.log('ModelSelector 초기화 완료');
  }
  
  /**
   * 컴포넌트 렌더링
   */
  render() {
    // 컨테이너 비우기
    this.container.innerHTML = '';
    
    // 기본 구조 생성
    this.container.innerHTML = `
      <div class="model-selector-header">
        <span class="model-selector-title">모델 선택</span>
        <span class="model-selector-icon">▼</span>
      </div>
      <div class="model-selector-dropdown"></div>
    `;
    
    // 참조 요소 가져오기
    this.header = this.container.querySelector('.model-selector-header');
    this.title = this.container.querySelector('.model-selector-title');
    this.icon = this.container.querySelector('.model-selector-icon');
    this.dropdown = this.container.querySelector('.model-selector-dropdown');
    
    // 모델 옵션 추가
    this.updateModels(this.options.models);
  }
  
  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    // 헤더 클릭시 드롭다운 토글
    this.header.addEventListener('click', () => {
      this.toggleDropdown();
    });
    
    // 외부 클릭시 드롭다운 닫기
    document.addEventListener('click', (event) => {
      if (!this.container.contains(event.target)) {
        this.closeDropdown();
      }
    });
    
    // ESC 키 누르면 드롭다운 닫기
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isDropdownOpen()) {
        this.closeDropdown();
      }
    });
  }
  
  /**
   * 드롭다운 토글
   */
  toggleDropdown() {
    if (this.isDropdownOpen()) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }
  
  /**
   * 드롭다운 열기
   */
  openDropdown() {
    this.dropdown.classList.add('open');
    this.icon.classList.add('open');
  }
  
  /**
   * 드롭다운 닫기
   */
  closeDropdown() {
    this.dropdown.classList.remove('open');
    this.icon.classList.remove('open');
  }
  
  /**
   * 드롭다운 상태 확인
   */
  isDropdownOpen() {
    return this.dropdown.classList.contains('open');
  }
  
  /**
   * 모델 목록 업데이트
   */
  updateModels(models) {
    console.log('모델 목록 업데이트 시작');
    
    // 드롭다운 비우기
    this.dropdown.innerHTML = '';
    
    // 모델이 없는 경우
    if (!models || models.length === 0) {
      console.log('사용 가능한 모델이 없습니다.');
      const emptyOption = document.createElement('div');
      emptyOption.className = 'model-option';
      emptyOption.textContent = '사용 가능한 모델이 없습니다';
      this.dropdown.appendChild(emptyOption);
      return;
    }
    
    console.log(`${models.length}개의 모델 옵션 추가 중...`);
    
    // 모델 옵션 추가
    models.forEach(model => {
      const option = document.createElement('div');
      option.className = 'model-option';
      if (model.id === this.selectedModelId) {
        option.classList.add('selected');
      }
      option.textContent = model.name;
      option.dataset.id = model.id;
      
      console.log(`모델 옵션 추가: ${model.id} (${model.name})`);
      
      // 옵션 클릭 이벤트
      option.addEventListener('click', () => {
        this.selectModel(model.id);
      });
      
      this.dropdown.appendChild(option);
    });
    
    // 모델이 있지만 선택된 모델이 없는 경우 첫 번째 모델 선택
    if (models.length > 0 && !this.selectedModelId) {
      console.log('기본 모델이 없어 첫 번째 모델을 선택합니다:', models[0].id);
      this.selectModel(models[0].id);
    } else {
      // 선택된 모델 표시 업데이트
      this.updateSelectedModelDisplay();
    }
    
    console.log('모델 목록 업데이트 완료');
  }
  
  /**
   * 모델 선택
   */
  selectModel(modelId) {
    // 이미 같은 모델이 선택된 경우
    if (this.selectedModelId === modelId) {
      this.closeDropdown();
      return;
    }
    
    // 새 모델 선택
    this.selectedModelId = modelId;
    
    // 선택된 옵션 표시 업데이트
    const options = this.dropdown.querySelectorAll('.model-option');
    options.forEach(option => {
      if (option.dataset.id === modelId) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
    
    // 선택된 모델 표시 업데이트
    this.updateSelectedModelDisplay();
    
    // 드롭다운 닫기
    this.closeDropdown();
    
    // 변경 이벤트 발생
    this.options.onChange(modelId);
  }
  
  /**
   * 선택된 모델 표시 업데이트
   */
  updateSelectedModelDisplay() {
    if (!this.selectedModelId) {
      this.title.textContent = '모델 선택';
      return;
    }
    
    // 선택된 모델 찾기
    const selectedModel = this.options.models.find(model => model.id === this.selectedModelId);
    if (selectedModel) {
      this.title.textContent = selectedModel.name;
    } else {
      this.title.textContent = '모델 선택';
    }
  }
  
  /**
   * 현재 선택된 모델 ID 가져오기
   */
  getCurrentModelId() {
    return this.selectedModelId;
  }
  
  /**
   * 모델 ID로 선택하기
   */
  setModelById(modelId) {
    if (!modelId) return;
    
    // 존재하는 모델인지 확인
    const modelExists = this.options.models.some(model => model.id === modelId);
    if (modelExists) {
      this.selectModel(modelId);
    }
  }
}