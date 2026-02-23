'use client';

import React, { useState, useEffect, useRef } from 'react';
import ProcessSteps from './EnterPrompt';
import ScriptGeneration from './ScriptGeneration';
import AudioGeneration from './AudioGeneration';
import KeywordsReview from './KeywordsReview';
import ClipsImagesGeneration from './ClipsImagesGeneration';
import MergingVideos from './MergingVideos';

interface CarouselItem {
  id: number;
  title: string;
  component?: React.ReactNode;
}

interface CarouselProps {
  items: CarouselItem[];
  autoPlayInterval?: number;
  className?: string;
  onIndexChange?: (index: number) => void;
}

const Carousel: React.FC<CarouselProps> = ({ 
  items, 
  autoPlayInterval = 2000,
  className = "",
  onIndexChange
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollY = useRef(0);
  const lastScrollTime = useRef(0);
  const scrollStartY = useRef(0);
  const hasMovedThisScroll = useRef(false);
  const canMove = useRef(true);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => {
      const newIndex = (prevIndex + 1) % items.length;
      console.log('Moving to next slide:', { from: prevIndex, to: newIndex, total: items.length });
      onIndexChange?.(newIndex);
      return newIndex;
    });
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => {
      const newIndex = (prevIndex - 1 + items.length) % items.length;
      console.log('Moving to previous slide:', { from: prevIndex, to: newIndex, total: items.length });
      onIndexChange?.(newIndex);
      return newIndex;
    });
  };

  const startAutoPlay = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(nextSlide, autoPlayInterval);
    setIsAutoPlaying(true);
  };

  const stopAutoPlay = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsAutoPlaying(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const currentTime = Date.now();
      const scrollDelta = currentScrollY - lastScrollY.current;
      
      console.log('Scroll detected:', { 
        currentScrollY, 
        lastY: lastScrollY.current, 
        scrollDelta, 
        canMove: canMove.current
      });
      
      // If not allowed to move, ignore
      if (!canMove.current) {
        lastScrollY.current = currentScrollY;
        return;
      }
      
      // Check if there's significant vertical scroll
      if (Math.abs(scrollDelta) > 20) {
        console.log('Moving carousel due to scroll');
        
        // Stop any existing autoplay
        stopAutoPlay();
        
        // Move carousel based on scroll direction
        if (scrollDelta > 0) {
          // Scrolling down - move to next item
          nextSlide();
        } else {
          // Scrolling up - move to previous item
          prevSlide();
        }
        
        // Prevent further movement for 800ms
        canMove.current = false;
        setTimeout(() => {
          canMove.current = true;
          console.log('Can move again');
        }, 800);
      }
      
      lastScrollY.current = currentScrollY;
    };

    // Handle wheel events
    const handleWheel = (e: WheelEvent) => {
      console.log('Wheel event detected:', e.deltaY, 'Can move:', canMove.current);
      
      // If not allowed to move, ignore
      if (!canMove.current) {
        return;
      }
      
      if (Math.abs(e.deltaY) > 20) {
        console.log('Moving carousel due to wheel');
        
        // Stop any existing autoplay
        stopAutoPlay();
        
        // Move carousel based on wheel direction
        if (e.deltaY > 0) {
          // Scrolling down - move to next item
          nextSlide();
        } else {
          // Scrolling up - move to previous item
          prevSlide();
        }
        
        // Prevent further movement for 800ms
        canMove.current = false;
        setTimeout(() => {
          canMove.current = true;
          console.log('Can move again');
        }, 800);
      }
    };

    // Handle touch events for mobile devices
    let touchStartY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchEndY = e.touches[0].clientY;
      const touchDelta = touchEndY - touchStartY;
      
      console.log('Touch move detected:', { touchDelta, canMove: canMove.current });
      
      // If not allowed to move, ignore
      if (!canMove.current) {
        return;
      }
      
      if (Math.abs(touchDelta) > 40) {
        console.log('Moving carousel due to touch');
        
        // Stop any existing autoplay
        stopAutoPlay();
        
        // Move carousel based on touch direction
        if (touchDelta > 0) {
          // Swiping down - move to next item
          nextSlide();
        } else {
          // Swiping up - move to previous item
          prevSlide();
        }
        
        // Prevent further movement for 800ms
        canMove.current = false;
        setTimeout(() => {
          canMove.current = true;
          console.log('Can move again');
        }, 800);
      }
    };

    // Add event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // No dependencies

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const renderCarouselItem = (item: CarouselItem, index: number) => {
    // Check if item has a custom component
    if (item.component) {
      return item.component;
    }

    // Default rendering based on index or title
    if (index === 0) {
      return <ProcessSteps />;
    }

    // Special case for "Generating Script" step
    if (item.title === "Generating Script") {
      return <ScriptGeneration />;
    }

    // Special case for "Generating Audio" step
    if (item.title === "Generating Audio") {
      return <AudioGeneration />;
    }

    // Special case for "Generating Keywords" step
    if (item.title === "Generating Keywords") {
      return <KeywordsReview />;
    }

    // Special case for "Generating Clips/Images" step
    if (item.title === "Generating Clips/Images") {
      return <ClipsImagesGeneration />;
    }

    // Special case for "Merging Videos" step
    if (item.title === "Merging Videos") {
      return <MergingVideos />;
    }

    // Default rendering for other items
    return (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
          {item.id}
        </div>
        <span className="text-white font-medium">{item.title}</span>
      </div>
    );
  };

  return (
    <div className={`carousel-container ${className}`}>
      <div className="carousel-wrapper">
        <div 
          className="carousel-track"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: 'transform 0.5s ease-in-out'
          }}
        >
          {items.map((item, index) => (
            <div key={item.id} className="carousel-item">
              {renderCarouselItem(item, index)}
            </div>
          ))}
        </div>
      </div>
      
      {/* Navigation dots */}
      <div className="carousel-dots">
        {items.map((_, index) => (
          <button
            key={index}
            className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => {
              setCurrentIndex(index);
              onIndexChange?.(index);
            }}
          />
        ))}
      </div>
      
      {/* Auto-play indicator */}
      {isAutoPlaying && (
        <div className="auto-play-indicator">
          <div className="auto-play-dot"></div>
        </div>
      )}
      
      {/* Manual trigger button for testing */}
      <button
        onClick={() => {
          console.log('Manual trigger clicked');
          nextSlide();
          canMove.current = false;
          setTimeout(() => {
            canMove.current = true;
            console.log('Can move again');
          }, 800);
        }}
        className="absolute top-1rem left-1rem bg-blue-500 text-white px-2 py-1 rounded text-sm z-10"
      >
        Next Item
      </button>
      
      {/* Current item indicator */}
      <div className="absolute top-1rem right-1rem bg-green-500 text-white px-2 py-1 rounded text-sm z-10">
        {currentIndex + 1} / {items.length}
      </div>
      
      {/* Movement status indicator */}
      <div className={`absolute top-3rem right-1rem px-2 py-1 rounded text-sm z-10 ${canMove.current ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
        {canMove.current ? 'Ready' : 'Cooldown'}
      </div>
    </div>
  );
};

export default Carousel; 