export default function LoadingBar() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)' }}>
      <div className="overflow-hidden" style={{ width: '360px', height: '4.5px', backgroundColor: '#e0e0e0', borderRadius: '3px' }}>
        <div
          style={{
            height: '100%',
            width: '100px',
            backgroundColor: '#1a1a1a',
            borderRadius: '3px',
            animation: 'loadingSlide 1.2s ease-in-out infinite',
          }}
        />
      </div>
      <style>{`
        @keyframes loadingSlide {
          0% { transform: translateX(-100px); }
          100% { transform: translateX(360px); }
        }
      `}</style>
    </div>
  );
}
